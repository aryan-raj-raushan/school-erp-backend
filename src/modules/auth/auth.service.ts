import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { AuthRepository } from './auth.repository';
import { RedisService } from '../redis/redis.service';
import { hashPassword, comparePassword } from '../../utils/hash.utils';
import { generateId } from '../../utils/uuid.utils';
import { AuthContext, CompanyRole, SchoolRole, ParentRole } from '../../shared/enums';
import { JwtPayload, RefreshTokenPayload } from '../../shared/types/jwt-payload.types';
import { RegisterCompanyDto } from './dto/register-company.dto';
import { LoginCompanyDto } from './dto/login-company.dto';
import { LoginSchoolDto } from './dto/login-school.dto';
import { LoginParentDto } from './dto/login-parent.dto';
import { LoginUnifiedDto } from './dto/login-unified.dto';
import { SetupPasswordDto } from './dto/setup-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SchoolSignupDto } from './dto/school-signup.dto';
import {
  LoginResponse,
  TokenPair,
  LoginOrSetupResponse,
  PasswordSetupRequired,
  PasswordChangeRequired,
} from './types/auth.types';
import { REGEX } from '../../utils/regex.utils';
import { SchoolsRepository } from '../schools/schools.repository';
import { School } from '../schools/types/school.types';
import { AuthTTL } from '../../shared/constants';
import { PermissionsService } from '../permissions/permissions.service';
import { RolesService } from '../roles/roles.service';

const COMPANY_ROLE_VALUES: string[] = Object.values(CompanyRole);

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly schoolsRepo: SchoolsRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly permissionsService: PermissionsService,
    private readonly rolesService: RolesService,
  ) {}

  async schoolSignup(dto: SchoolSignupDto): Promise<LoginResponse> {
    const dialCode = dto.dial_code ?? '+91';

    const phoneTaken = await this.authRepo.findSchoolUserByPhoneGlobal(dto.phone_number, dialCode);
    if (phoneTaken) throw new ConflictException('Phone number already registered');

    const school = await this.schoolsRepo.create({
      id: generateId(),
      name: dto.school_name,
      code: dto.school_code,
      board_type: dto.board_type as School['board_type'],
      marking_system: dto.marking_system as School['marking_system'],
      created_by: 'self-signup',
    });

    await this.rolesService.seedSystemRoles(school.id);

    const password_hash = await hashPassword(dto.password);

    const adminUser = await this.authRepo.createSchoolUser({
      id: generateId(),
      school_id: school.id,
      first_name: dto.first_name,
      last_name: dto.last_name,
      dial_code: dialCode,
      phone_number: dto.phone_number,
      email: dto.email,
      password_hash,
      role: 'SCHOOL_ADMIN',
      created_by: 'self-signup',
    });

    const tokens = await this.generateTokens({
      sub: adminUser.id,
      phone: adminUser.phone_number,
      role: adminUser.role as SchoolRole,
      school_id: school.id,
      context: AuthContext.SCHOOL,
    });

    return {
      ...tokens,
      user: {
        id: adminUser.id,
        phone: adminUser.phone_number,
        role: adminUser.role,
        schoolId: school.id,
        context: AuthContext.SCHOOL,
      },
    };
  }

  async registerCompany(dto: RegisterCompanyDto, bootstrapSecret?: string) {
    const emailTaken = await this.authRepo.findCompanyUserByEmailExists(dto.email);
    if (emailTaken) throw new ConflictException('Email already registered');

    const isSuperAdmin = dto.role === CompanyRole.SUPER_ADMIN || !dto.role;

    if (isSuperAdmin) {
      // Require bootstrap secret from env to create SUPER_ADMIN
      const envSecret = this.configService.get<string>('BOOTSTRAP_SECRET');
      if (!envSecret) {
        throw new ForbiddenException(
          'SUPER_ADMIN registration is disabled — set BOOTSTRAP_SECRET env var',
        );
      }
      if (bootstrapSecret !== envSecret) {
        throw new ForbiddenException('Invalid bootstrap secret');
      }
      const exists = await this.authRepo.superAdminExists();
      if (exists)
        throw new ForbiddenException('A SUPER_ADMIN already exists. Only one is allowed.');
    }

    const password_hash = await hashPassword(dto.password);

    return this.authRepo.createCompanyUser({
      id: generateId(),
      first_name: dto.first_name,
      last_name: dto.last_name,
      email: dto.email,
      password_hash,
      role: (dto.role as CompanyRole) ?? CompanyRole.SUPER_ADMIN,
    });
  }

  async loginCompany(dto: LoginCompanyDto): Promise<LoginResponse> {
    const user = await this.authRepo.findCompanyUserByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!user.is_active) throw new UnauthorizedException('Account is deactivated');

    const passwordMatch = await comparePassword(dto.password, user.password_hash);
    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials');

    await this.authRepo.updateCompanyUserLastLogin(user.id);

    if (user.role !== CompanyRole.SUPER_ADMIN) {
      await this.cacheCompanyUserSchools(user.id);
    }

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role as CompanyRole,
      context: AuthContext.COMPANY,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        context: AuthContext.COMPANY,
      },
    };
  }

  async loginSchool(dto: LoginSchoolDto): Promise<LoginResponse | PasswordChangeRequired> {
    const user = await this.authRepo.findSchoolUserByPhone(dto.phone_number, dto.dial_code);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!user.is_active) throw new UnauthorizedException('Account is deactivated');

    const school = await this.authRepo.findSchoolById(user.school_id);
    if (!school || !school.is_active) {
      throw new UnauthorizedException('School is deactivated');
    }

    if (!user.password_hash)
      throw new UnauthorizedException(
        'Account setup incomplete — use /auth/login to set your password',
      );

    const passwordMatch = await comparePassword(dto.password, user.password_hash);
    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials');

    return this.issueSchoolTokensOrChangeRequired(user);
  }

  async loginParent(dto: LoginParentDto): Promise<LoginResponse> {
    const candidates = await this.authRepo.findActiveParentCandidatesByPhone(
      dto.phone_number,
      dto.dial_code,
    );
    if (!candidates.length) throw new UnauthorizedException('Invalid credentials');

    let matched: (typeof candidates)[number] | undefined;
    for (const candidate of candidates) {
      if (await comparePassword(dto.password, candidate.password_hash!)) {
        matched = candidate;
        break;
      }
    }
    if (!matched) throw new UnauthorizedException('Invalid credentials');

    const school = await this.authRepo.findSchoolById(matched.school_id);
    if (!school || !school.is_active) {
      throw new UnauthorizedException('School is deactivated');
    }

    await this.authRepo.updateParentLastLogin(matched.id);

    const tokens = await this.generateTokens({
      sub: matched.id,
      phone: matched.phone_number,
      role: ParentRole.PARENT,
      school_id: matched.school_id,
      student_id: matched.student_id,
      context: AuthContext.PARENT,
    });

    return {
      ...tokens,
      user: {
        id: matched.id,
        phone: matched.phone_number,
        role: ParentRole.PARENT,
        schoolId: matched.school_id,
        context: AuthContext.PARENT,
      },
    };
  }

  async loginUnified(dto: LoginUnifiedDto): Promise<LoginOrSetupResponse> {
    const isEmail = REGEX.EMAIL.test(dto.identifier);

    // Check company users first (always email-based)
    if (isEmail) {
      const companyUser = await this.authRepo.findCompanyUserByEmail(dto.identifier);
      if (companyUser) {
        if (!companyUser.is_active) throw new UnauthorizedException('Account is deactivated');
        const match = await comparePassword(dto.password, companyUser.password_hash);
        if (!match) throw new UnauthorizedException('Invalid credentials');
        await this.authRepo.updateCompanyUserLastLogin(companyUser.id);
        if (companyUser.role !== CompanyRole.SUPER_ADMIN) {
          await this.cacheCompanyUserSchools(companyUser.id);
        }
        const tokens = await this.generateTokens({
          sub: companyUser.id,
          email: companyUser.email,
          role: companyUser.role as CompanyRole,
          context: AuthContext.COMPANY,
        });
        return {
          ...tokens,
          user: {
            id: companyUser.id,
            email: companyUser.email,
            role: companyUser.role,
            context: AuthContext.COMPANY,
          },
        };
      }
    }

    // School user lookup — by email or phone
    const schoolUser = isEmail
      ? await this.authRepo.findSchoolUserByEmail(dto.identifier)
      : await this.authRepo.findSchoolUserByPhone(dto.identifier, dto.dial_code ?? '+91');

    if (!schoolUser) throw new UnauthorizedException('Invalid credentials');
    if (!schoolUser.is_active) throw new UnauthorizedException('Account is deactivated');

    const school = await this.authRepo.findSchoolById(schoolUser.school_id);
    if (!school || !school.is_active) {
      throw new UnauthorizedException('School is deactivated');
    }

    // No password set → school admin must complete signup
    if (!schoolUser.password_hash) {
      const setupToken = this.generateSetupToken(schoolUser.id);
      return {
        needs_password_setup: true,
        setup_token: setupToken,
      } satisfies PasswordSetupRequired;
    }

    const match = await comparePassword(dto.password, schoolUser.password_hash);
    if (!match) throw new UnauthorizedException('Invalid credentials');

    return this.issueSchoolTokensOrChangeRequired(schoolUser);
  }

  /**
   * Called after a school user's password has already been verified. Gates access
   * behind a forced password change when the current password_hash was set by a
   * Super Admin at school-creation time (must_change_password) and hasn't been
   * rotated by the user yet — the initial password is otherwise usable only once.
   */
  private async issueSchoolTokensOrChangeRequired(user: {
    id: string;
    phone_number: string;
    role: string;
    school_id: string;
    custom_role_id?: string | null;
    must_change_password: boolean;
  }): Promise<LoginResponse | PasswordChangeRequired> {
    if (user.must_change_password) {
      return {
        must_change_password: true,
        change_token: this.generateChangePasswordToken(user.id),
      } satisfies PasswordChangeRequired;
    }

    await this.authRepo.updateSchoolUserLastLogin(user.id);

    const tokens = await this.generateTokens({
      sub: user.id,
      phone: user.phone_number,
      role: user.role as SchoolRole,
      school_id: user.school_id,
      custom_role_id: user.custom_role_id ?? null,
      context: AuthContext.SCHOOL,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        phone: user.phone_number,
        role: user.role,
        schoolId: user.school_id,
        context: AuthContext.SCHOOL,
      },
    };
  }

  async setupPassword(dto: SetupPasswordDto): Promise<LoginResponse> {
    if (dto.password !== dto.confirm_password) {
      throw new BadRequestException('Passwords do not match');
    }

    let payload: { sub: string; purpose: string };
    try {
      payload = this.jwtService.verify(dto.setup_token, {
        secret: this.configService.get<string>('jwt.accessSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired setup token');
    }

    if (payload.purpose !== 'password_setup') {
      throw new UnauthorizedException('Invalid setup token');
    }

    const user = await this.authRepo.findSchoolUserById(payload.sub);
    if (!user) throw new NotFoundException('User not found');
    if (user.password_hash)
      throw new BadRequestException('Password already set — use login instead');

    const school = await this.authRepo.findSchoolById(user.school_id);
    if (!school || !school.is_active) {
      throw new UnauthorizedException('School is deactivated');
    }

    const password_hash = await hashPassword(dto.password);
    await this.authRepo.setSchoolUserPassword(user.id, password_hash);
    await this.authRepo.updateSchoolUserLastLogin(user.id);

    const tokens = await this.generateTokens({
      sub: user.id,
      phone: user.phone_number,
      role: user.role as SchoolRole,
      school_id: user.school_id,
      custom_role_id: user.custom_role_id ?? null,
      context: AuthContext.SCHOOL,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        phone: user.phone_number,
        role: user.role,
        schoolId: user.school_id,
        context: AuthContext.SCHOOL,
      },
    };
  }

  async changePassword(dto: ChangePasswordDto): Promise<LoginResponse> {
    if (dto.password !== dto.confirm_password) {
      throw new BadRequestException('Passwords do not match');
    }

    let payload: { sub: string; purpose: string };
    try {
      payload = this.jwtService.verify(dto.change_token, {
        secret: this.configService.get<string>('jwt.accessSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired change-password token');
    }

    if (payload.purpose !== 'password_change_required') {
      throw new UnauthorizedException('Invalid change-password token');
    }

    const user = await this.authRepo.findSchoolUserById(payload.sub);
    if (!user) throw new NotFoundException('User not found');
    if (!user.must_change_password)
      throw new BadRequestException('Password change is not required for this account');

    const school = await this.authRepo.findSchoolById(user.school_id);
    if (!school || !school.is_active) {
      throw new UnauthorizedException('School is deactivated');
    }

    const password_hash = await hashPassword(dto.password);
    await this.authRepo.setSchoolUserPassword(user.id, password_hash);
    await this.authRepo.updateSchoolUserLastLogin(user.id);

    const tokens = await this.generateTokens({
      sub: user.id,
      phone: user.phone_number,
      role: user.role as SchoolRole,
      school_id: user.school_id,
      custom_role_id: user.custom_role_id ?? null,
      context: AuthContext.SCHOOL,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        phone: user.phone_number,
        role: user.role,
        schoolId: user.school_id,
        context: AuthContext.SCHOOL,
      },
    };
  }

  private generateSetupToken(userId: string): string {
    return this.jwtService.sign(
      { sub: userId, purpose: 'password_setup' },
      {
        secret: this.configService.get<string>('jwt.accessSecret'),
        expiresIn: '24h',
      },
    );
  }

  private generateChangePasswordToken(userId: string): string {
    return this.jwtService.sign(
      { sub: userId, purpose: 'password_change_required' },
      {
        secret: this.configService.get<string>('jwt.accessSecret'),
        expiresIn: '24h',
      },
    );
  }

  async refresh(userId: string, tokenId: string, context: AuthContext): Promise<TokenPair> {
    const exists = await this.redisService.exists(`refresh_token:${userId}:${tokenId}`);
    if (!exists) throw new UnauthorizedException('Refresh token revoked or expired');

    await this.redisService.del(`refresh_token:${userId}:${tokenId}`);

    let payload: Partial<JwtPayload>;

    if (context === AuthContext.COMPANY) {
      const user = await this.authRepo.findCompanyUserById(userId);
      if (!user) throw new NotFoundException('User not found');
      payload = {
        sub: user.id,
        email: user.email,
        role: user.role as CompanyRole,
        context: AuthContext.COMPANY,
      };
    } else {
      const user = await this.authRepo.findSchoolUserById(userId);
      if (!user) throw new NotFoundException('User not found');

      const school = await this.authRepo.findSchoolById(user.school_id);
      if (!school || !school.is_active) {
        throw new UnauthorizedException('School is deactivated');
      }

      payload = {
        sub: user.id,
        phone: user.phone_number,
        role: user.role as SchoolRole,
        school_id: user.school_id,
        custom_role_id: user.custom_role_id ?? null,
        context: AuthContext.SCHOOL,
      };
    }

    return this.generateTokens(payload as JwtPayload);
  }

  async logout(userId: string, tokenId: string, rawAccessToken?: string): Promise<void> {
    await this.redisService.delByPattern(`*refresh_token:${userId}:*`);
    await this.redisService.del(`session:${userId}`);
    void tokenId;

    // BUG-002: blacklist the access token so it cannot be used after logout
    if (rawAccessToken) {
      try {
        const decoded = this.jwtService.decode(rawAccessToken) as {
          iat?: number;
          exp?: number;
        } | null;
        if (decoded?.iat && decoded?.exp) {
          const ttl = decoded.exp - Math.floor(Date.now() / 1000);
          if (ttl > 0) {
            await this.redisService.setex(`blocked_at:${userId}:${decoded.iat}`, ttl, '1');
          }
        }
      } catch {
        // ignore decode errors — token already invalid
      }
    }
  }

  async getMe(userId: string, context: AuthContext, role?: string, schoolId?: string) {
    // Any company user impersonating a school (via switchSchool) — full access,
    // identified as themselves. PermissionsGuard/RolesGuard already bypass checks
    // for this case; mirror that here so the frontend's permission-gated UI
    // matches actual backend access. switchSchool already gated which school
    // a non-SUPER_ADMIN/OPERATOR company user is allowed to reach.
    if (context === AuthContext.SCHOOL && role && COMPANY_ROLE_VALUES.includes(role) && schoolId) {
      const user = await this.authRepo.findCompanyUserProfile(userId);
      if (!user) throw new NotFoundException('User not found');
      const permissions = await this.permissionsService.getAllPermissionSlugs();
      return { ...user, school_id: schoolId, permissions };
    }

    if (context === AuthContext.COMPANY || role === CompanyRole.SUPER_ADMIN) {
      const user = await this.authRepo.findCompanyUserProfile(userId);
      if (!user) throw new NotFoundException('User not found');
      return user;
    }

    if (context === AuthContext.PARENT) {
      const parent = await this.authRepo.findParentProfileById(userId);
      if (!parent) throw new NotFoundException('User not found');
      return { ...parent, role: ParentRole.PARENT, permissions: [] };
    }

    const user = await this.authRepo.findSchoolUserProfile(userId);
    if (!user) throw new NotFoundException('User not found');

    // Resolve permissions from DB (fully dynamic — no enum coupling)
    const permissions = schoolId
      ? await this.permissionsService.resolveUserPermissions(
          userId,
          schoolId,
          user.custom_role_id,
          user.role,
        )
      : [];

    return { ...user, permissions };
  }

  async switchSchool(userId: string, schoolId: string): Promise<LoginResponse> {
    const user = await this.authRepo.findCompanyUserById(userId);
    if (!user) throw new ForbiddenException('Only company staff can switch into a school');

    // SUPER_ADMIN/OPERATOR can impersonate any school; everyone else (ADMIN,
    // SUPPORT, SALES) is restricted to schools explicitly assigned to them via
    // company_user_schools — the same scoping already used for schools/invoices lists.
    const isUnrestricted =
      user.role === CompanyRole.SUPER_ADMIN || user.role === CompanyRole.OPERATOR;
    if (!isUnrestricted) {
      const permittedIds = await this.authRepo.getCompanyUserSchoolIds(userId);
      if (!permittedIds.includes(schoolId)) {
        throw new ForbiddenException('You do not have access to this school');
      }
    }

    const school = await this.authRepo.findSchoolById(schoolId);
    if (!school) throw new NotFoundException(`School '${schoolId}' not found`);
    if (!school.is_active) throw new ForbiddenException(`School '${schoolId}' is inactive`);

    const role = user.role as CompanyRole;
    const tokens = await this.generateTokens({
      sub: userId,
      email: user.email,
      role,
      school_id: schoolId,
      context: AuthContext.SCHOOL,
    });

    return {
      ...tokens,
      user: {
        id: userId,
        email: user.email,
        role,
        schoolId: schoolId,
        context: AuthContext.SCHOOL,
      },
    };
  }

  private async generateTokens(payload: Omit<JwtPayload, 'iat' | 'exp'>): Promise<TokenPair> {
    const tokenId = generateId();

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.accessSecret'),
      expiresIn: this.configService.get<string>('jwt.accessExpiresIn'),
    });

    const refreshPayload: RefreshTokenPayload = {
      sub: payload.sub,
      token_id: tokenId,
      context: payload.context,
    };

    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: this.configService.get<string>('jwt.refreshExpiresIn'),
    });

    await this.redisService.setex(
      `refresh_token:${payload.sub}:${tokenId}`,
      AuthTTL.REFRESH_TOKEN_SECONDS,
      '1',
    );

    await this.redisService.setex(
      `session:${payload.sub}`,
      AuthTTL.ACCESS_TOKEN_SECONDS,
      JSON.stringify(payload),
    );

    return { accessToken, refreshToken };
  }

  private async cacheCompanyUserSchools(userId: string): Promise<void> {
    const schoolIds = await this.authRepo.getCompanyUserSchoolIds(userId);

    if (schoolIds.length > 0) {
      const key = `company_user:${userId}:schools`;
      await this.redisService.del(key);
      await this.redisService.sadd(key, ...schoolIds);
      await this.redisService.expire(key, AuthTTL.COMPANY_SCHOOLS_SECONDS);
    }
  }
}
