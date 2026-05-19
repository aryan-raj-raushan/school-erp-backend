import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../../modules/redis/redis.service';
import { FEATURE_KEY } from '../decorators/require-feature.decorator';
import { StringUtils } from '../../utils/string.utils';

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.getAllAndOverride<string>(FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredFeature) return true;

    const request = context.switchToHttp().getRequest();
    const schoolId = request.user?.school_id || request.tenantId;

    if (!schoolId) return true;

    const raw = await this.redisService.get(`feature_flags:${schoolId}`);
    if (StringUtils.isEmpty(raw)) return true;

    const flags = StringUtils.safeJsonParse<Record<string, boolean>>(raw!, {});
    if (flags[requiredFeature] === false) {
      throw new ForbiddenException(`Feature '${requiredFeature}' is not enabled for this school`);
    }

    return true;
  }
}
