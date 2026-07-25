import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PARENT_ACCESSIBLE_KEY } from '../decorators/parent-accessible.decorator';
import { AuthContext } from '../../shared/enums';

/**
 * Default-deny gate for AuthContext.PARENT requests. Many staff-facing
 * endpoints carry no @Permissions()/@Roles() at all (they rely on staff-only
 * routing conventions), which means a valid parent JWT can otherwise reach
 * them unfiltered and school-wide. This guard blocks every route for a
 * parent-context request unless it's explicitly opened up with
 * @ParentAccessible() (or already @Public()). It has zero effect on
 * non-parent contexts.
 */
@Injectable()
export class ParentScopeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user || user.context !== AuthContext.PARENT) return true;

    const isParentAccessible = this.reflector.getAllAndOverride<boolean>(PARENT_ACCESSIBLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!isParentAccessible) {
      throw new ForbiddenException('This resource is not available to the parent portal');
    }

    return true;
  }
}
