import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../../../shared/types/jwt-payload.types';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.accessSecret'),
    });
  }

  // BUG-002: check access-token blacklist on every authenticated request
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (!payload.sub || 'purpose' in payload || !payload.context) {
      throw new UnauthorizedException('Invalid token payload');
    }

    if (payload.iat) {
      const blocked = await this.redisService.exists(`blocked_at:${payload.sub}:${payload.iat}`);
      if (blocked) throw new UnauthorizedException('Token has been revoked');

      const revokedBefore = await this.redisService.get(`revoked_before:${payload.sub}`);
      if (revokedBefore && payload.iat <= Number(revokedBefore)) {
        throw new UnauthorizedException('Token has been revoked');
      }

      if (payload.school_id) {
        const schoolRevokedBefore = await this.redisService.get(
          `school_revoked_before:${payload.school_id}`,
        );
        if (schoolRevokedBefore && payload.iat <= Number(schoolRevokedBefore)) {
          throw new UnauthorizedException('School is deactivated');
        }
      }
    }

    return payload;
  }
}
