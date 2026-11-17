import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { AnyRole, CompanyRole, AuthContext } from '../../shared/enums';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PLATFORM_PERMISSIONS_KEY } from '../decorators/platform-permission.decorator';
import { CompanyAccessService } from '../../modules/company-roles/company-access.service';

const COMPANY_ROLES: string[] = Object.values(CompanyRole);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly companyAccess: CompanyAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredRoles = this.reflector.getAllAndOverride<AnyRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const platformPermissions = this.reflector.getAllAndOverride<string[]>(
      PLATFORM_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const hasRoleRule = !!requiredRoles?.length;
    const hasPlatformRule = !!platformPermissions?.length;
    if (!hasRoleRule && !hasPlatformRule) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('Access denied');

    if (user.role === CompanyRole.SUPER_ADMIN) return true;

    if (user.context === AuthContext.COMPANY && COMPANY_ROLES.includes(user.role)) {
      const customRole = await this.companyAccess.getCustomRole(user.sub);
      if (customRole) {
        if (
          hasPlatformRule &&
          platformPermissions.some((p) => customRole.permissions.includes(p))
        ) {
          return true;
        }
        throw new ForbiddenException(
          `Your role '${customRole.role_name}' does not include access to this area`,
        );
      }
    }

    if (!hasRoleRule) return true;

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
