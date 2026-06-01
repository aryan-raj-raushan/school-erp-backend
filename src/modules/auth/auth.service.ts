import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { AuthRepository } from './auth.repository';
import { RedisService } from '../redis/redis.service';
import { hashPassword, comparePassword } from '../../utils/hash.utils';
import { generateId } from '../../utils/uuid.utils';
import { AuthContext, CompanyRole, SchoolRole } from '../../shared/enums';
import { JwtPayload, RefreshTokenPayload } from '../../shared/types/jwt-payload.types';
import { RegisterCompanyDto } from './dto/register-company.dto';
import { LoginCompanyDto } from './dto/login-company.dto';
import { LoginSchoolDto } from './dto/login-school.dto';
import { LoginResponse, TokenPair } from './types/auth.types';

const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;
const COMPANY_USER_SCHOOLS_TTL = 3600;

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async registerCompany(dto: RegisterCompanyDto) {
    const emailTaken = await this.authRepo.findCompanyUserByEmailExists(dto.email);
    if (emailTaken) throw new ConflictException('Email already registered');

    // BUG-001 + BUG-013: enforce single SUPER_ADMIN — only one may ever exist
    if (dto.role === CompanyRole.SUPER_ADMIN) {
      const exists = await this.authRepo.superAdminExists();
      if (exists) throw new ForbiddenException('A SUPER_ADMIN already exists. Only one is allowed.');
    }

    const password_hash = await hashPassword(dto.password);

    return this.authRepo.createCompanyUser({
      id: generateId(),
      first_name: dto.first_name,
      last_name: dto.last_name,
      email: dto.email,
      password_hash,
      role: (dto.role as CompanyRole) ?? CompanyRole.ADMIN,
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

  async loginSchool(dto: LoginSchoolDto): Promise<LoginResponse> {
    const user = await this.authRepo.findSchoolUserByPhone(dto.phone_number, dto.dial_code);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!user.is_active) throw new UnauthorizedException('Account is deactivated');

    const passwordMatch = await comparePassword(dto.password, user.password_hash);
    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials');

    await this.authRepo.updateSchoolUserLastLogin(user.id);

    const tokens = await this.generateTokens({
      sub: user.id,
      phone: user.phone_number,
      role: user.role as SchoolRole,
      school_id: user.school_id,
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

  async refresh(userId: string, tokenId: string, context: AuthContext): Promise<TokenPair> {
    const exists = await this.redisService.exists(`refresh_token:${userId}:${tokenId}`);
    if (!exists) throw new UnauthorizedException('Refresh token revoked or expired');

    await this.redisService.del(`refresh_token:${userId}:${tokenId}`);

    let payload: Partial<JwtPayload>;

    if (context === AuthContext.COMPANY) {
      const user = await this.authRepo.findCompanyUserById(userId);
      if (!user) throw new NotFoundException('User not found');
      payload = { sub: user.id, email: user.email, role: user.role as CompanyRole, context: AuthContext.COMPANY };
    } else {
      const user = await this.authRepo.findSchoolUserById(userId);
      if (!user) throw new NotFoundException('User not found');
      payload = {
        sub: user.id,
        phone: user.phone_number,
        role: user.role as SchoolRole,
        school_id: user.school_id,
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
        const decoded = this.jwtService.decode(rawAccessToken) as { iat?: number; exp?: number } | null;
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

  async getMe(userId: string, context: AuthContext) {
    if (context === AuthContext.COMPANY) {
      const user = await this.authRepo.findCompanyUserProfile(userId);
      if (!user) throw new NotFoundException('User not found');
      return user;
    }

    const user = await this.authRepo.findSchoolUserProfile(userId);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async switchSchool(userId: string, schoolId: string): Promise<LoginResponse> {
    const user = await this.authRepo.findCompanyUserById(userId);
    if (!user || user.role !== CompanyRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only SUPER_ADMIN can switch into a school');
    }

    const school = await this.authRepo.findSchoolById(schoolId);
    if (!school) throw new NotFoundException(`School '${schoolId}' not found`);
    if (!school.is_active) throw new ForbiddenException(`School '${schoolId}' is inactive`);

    const tokens = await this.generateTokens({
      sub: userId,
      email: user.email,
      role: CompanyRole.SUPER_ADMIN,
      school_id: schoolId,
      context: AuthContext.SCHOOL,
    });

    return {
      ...tokens,
      user: {
        id: userId,
        email: user.email,
        role: CompanyRole.SUPER_ADMIN,
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
      REFRESH_TTL_SECONDS,
      '1',
    );

    await this.redisService.setex(
      `session:${payload.sub}`,
      ACCESS_TTL_SECONDS,
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
      await this.redisService.expire(key, COMPANY_USER_SCHOOLS_TTL);
    }
  }
}
