import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';

import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { companyUsers, schoolUsers, companyUserSchools } from '../../database/drizzle/schema';
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
    @Inject(DRIZZLE_ORM) private readonly db: DrizzleDB,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async registerCompany(dto: RegisterCompanyDto) {
    const [existing] = await this.db
      .select({ id: companyUsers.id })
      .from(companyUsers)
      .where(eq(companyUsers.email, dto.email));

    if (existing) throw new ConflictException('Email already registered');

    // BUG-001 + BUG-013: enforce single SUPER_ADMIN — only one may ever exist
    if (dto.role === CompanyRole.SUPER_ADMIN) {
      const [existingSuperAdmin] = await this.db
        .select({ id: companyUsers.id })
        .from(companyUsers)
        .where(and(eq(companyUsers.role, CompanyRole.SUPER_ADMIN), eq(companyUsers.deleted, false)))
        .limit(1);

      if (existingSuperAdmin) {
        throw new ForbiddenException('A SUPER_ADMIN already exists. Only one is allowed.');
      }
    }

    const password_hash = await hashPassword(dto.password);
    const id = generateId();

    const [user] = await this.db
      .insert(companyUsers)
      .values({
        id,
        first_name: dto.first_name,
        last_name: dto.last_name,
        email: dto.email,
        password_hash,
        role: (dto.role as CompanyRole) ?? CompanyRole.ADMIN,
      })
      .returning({
        id: companyUsers.id,
        email: companyUsers.email,
        role: companyUsers.role,
        first_name: companyUsers.first_name,
      });

    return user;
  }

  async loginCompany(dto: LoginCompanyDto): Promise<LoginResponse> {
    const [user] = await this.db
      .select()
      .from(companyUsers)
      .where(and(eq(companyUsers.email, dto.email), eq(companyUsers.deleted, false)));

    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!user.is_active) throw new UnauthorizedException('Account is deactivated');

    const passwordMatch = await comparePassword(dto.password, user.password_hash);
    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials');

    await this.db
      .update(companyUsers)
      .set({ last_login_at: new Date() })
      .where(eq(companyUsers.id, user.id));

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
    const [user] = await this.db
      .select()
      .from(schoolUsers)
      .where(
        and(
          eq(schoolUsers.phone_number, dto.phone_number),
          eq(schoolUsers.dial_code, dto.dial_code),
          eq(schoolUsers.deleted, false),
        ),
      );

    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!user.is_active) throw new UnauthorizedException('Account is deactivated');

    const passwordMatch = await comparePassword(dto.password, user.password_hash);
    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials');

    await this.db
      .update(schoolUsers)
      .set({ last_login_at: new Date() })
      .where(eq(schoolUsers.id, user.id));

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
      const [user] = await this.db
        .select()
        .from(companyUsers)
        .where(and(eq(companyUsers.id, userId), eq(companyUsers.deleted, false)));
      if (!user) throw new NotFoundException('User not found');
      payload = { sub: user.id, email: user.email, role: user.role as CompanyRole, context: AuthContext.COMPANY };
    } else {
      const [user] = await this.db
        .select()
        .from(schoolUsers)
        .where(and(eq(schoolUsers.id, userId), eq(schoolUsers.deleted, false)));
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
      const [user] = await this.db
        .select({
          id: companyUsers.id,
          first_name: companyUsers.first_name,
          last_name: companyUsers.last_name,
          email: companyUsers.email,
          role: companyUsers.role,
          created_at: companyUsers.created_at,
        })
        .from(companyUsers)
        .where(eq(companyUsers.id, userId));
      if (!user) throw new NotFoundException('User not found');
      return user;
    }

    const [user] = await this.db
      .select({
        id: schoolUsers.id,
        first_name: schoolUsers.first_name,
        last_name: schoolUsers.last_name,
        phone_number: schoolUsers.phone_number,
        email: schoolUsers.email,
        role: schoolUsers.role,
        school_id: schoolUsers.school_id,
        profile_image: schoolUsers.profile_image,
        created_at: schoolUsers.created_at,
      })
      .from(schoolUsers)
      .where(eq(schoolUsers.id, userId));
    if (!user) throw new NotFoundException('User not found');
    return user;
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
    const rows = await this.db
      .select({ school_id: companyUserSchools.school_id })
      .from(companyUserSchools)
      .where(eq(companyUserSchools.user_id, userId));

    if (rows.length > 0) {
      const key = `company_user:${userId}:schools`;
      await this.redisService.del(key);
      await this.redisService.sadd(key, ...rows.map((r) => r.school_id));
      await this.redisService.expire(key, COMPANY_USER_SCHOOLS_TTL);
    }
  }
}
