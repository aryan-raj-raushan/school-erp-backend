import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { schools, subscriptions } from '../../database/drizzle/schema';
import { RedisService } from '../../modules/redis/redis.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { BYPASS_RESTRICTION_KEY } from '../decorators/bypass-restriction.decorator';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { AuthContext } from '../../shared/enums';
import { CacheTTL } from '../../shared/constants';

interface RestrictionState {
  level: 'NONE' | 'SOFT' | 'PARTIAL' | 'COMPLETE';
  restrictedResources: string[];
}

/**
 * Enforces the postpaid service-restriction policy for SCHOOL-context requests.
 * COMPLETE blocks everything, PARTIAL blocks non-GET requests, SOFT blocks
 * requests whose @Permissions() resource is in the school's active
 * subscription's restricted_resources list — all except routes explicitly
 * marked @Public() or @BypassRestriction() (billing/auth routes a restricted
 * school must still reach to pay its bill).
 */
@Injectable()
export class SchoolRestrictionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
    @Inject(DRIZZLE_ORM) private readonly db: DrizzleDB,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const bypass = this.reflector.getAllAndOverride<boolean>(BYPASS_RESTRICTION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (bypass) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user || user.context !== AuthContext.SCHOOL || !user.school_id) return true;

    const state = await this.getRestrictionState(user.school_id);
    if (state.level === 'NONE') return true;

    if (state.level === 'COMPLETE') {
      throw new ForbiddenException(
        "This school's access has been suspended pending payment. Please clear outstanding invoices to restore access.",
      );
    }

    if (state.level === 'PARTIAL') {
      if (request.method !== 'GET') {
        throw new ForbiddenException(
          'This school is restricted to read-only access pending payment.',
        );
      }
      return true;
    }

    // SOFT — only enforceable on routes that declare @Permissions(), since
    // that's the only metadata that tells us which resource a route touches.
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const resource = requiredPermissions?.[0]?.split('.')[0];
    if (resource && state.restrictedResources.includes(resource)) {
      throw new ForbiddenException(`Access to '${resource}' is restricted pending payment.`);
    }
    return true;
  }

  private async getRestrictionState(schoolId: string): Promise<RestrictionState> {
    const cacheKey = `school_restriction:${schoolId}`;
    return this.redisService.getOrSet(cacheKey, CacheTTL.MEDIUM, async () => {
      const [school] = await this.db
        .select({ restriction_level: schools.restriction_level })
        .from(schools)
        .where(eq(schools.id, schoolId));

      if (!school || school.restriction_level === 'NONE') {
        return { level: 'NONE', restrictedResources: [] };
      }

      const [sub] = await this.db
        .select({ restricted_resources: subscriptions.restricted_resources })
        .from(subscriptions)
        .where(and(eq(subscriptions.school_id, schoolId), eq(subscriptions.status, 'ACTIVE')))
        .limit(1);

      return {
        level: school.restriction_level,
        restrictedResources: sub?.restricted_resources ?? [],
      };
    });
  }
}
