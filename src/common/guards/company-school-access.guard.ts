import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { RedisService } from '../../modules/redis/redis.service';
import { CompanyRole, AuthContext } from '../../shared/enums';

@Injectable()
export class CompanySchoolAccessGuard implements CanActivate {
  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.context !== AuthContext.COMPANY) return true;

    if (user.role === CompanyRole.SUPER_ADMIN) return true;

    const schoolId = request.params?.schoolId || request.body?.school_id;
    if (!schoolId) return true;

    const isMember = await this.redisService.sismember(
      `company_user:${user.sub}:schools`,
      schoolId,
    );

    if (!isMember) {
      throw new ForbiddenException('You do not have access to this school');
    }

    return true;
  }
}
