import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { AnyRole, CompanyRole, AuthContext } from '../../shared/enums';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

const COMPANY_ROLES: string[] = Object.values(CompanyRole);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredRoles = this.reflector.getAllAndOverride<AnyRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('Access denied');

    if (user.role === CompanyRole.SUPER_ADMIN) return true;

    // Any company user impersonating a school (via switchSchool) gets full
    // access as that school's admin — mirrors the same bypass in PermissionsGuard.
    if (
      COMPANY_ROLES.includes(user.role) &&
      user.context === AuthContext.SCHOOL &&
      user.school_id
    ) {
      return true;
    }

    // If route has @Permissions(), skip role check — PermissionsGuard handles access
    const hasPermissionsDecorator = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (hasPermissionsDecorator && hasPermissionsDecorator.length > 0) return true;

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(`Role '${user.role}' is not allowed to access this resource`);
    }

    return true;
  }
}
