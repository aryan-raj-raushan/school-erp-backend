import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ModuleRef } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { CompanyRole } from '../../shared/enums';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly moduleRef: ModuleRef,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Permissions() decorator → this guard is a no-op for this route
    if (!requiredPermissions || requiredPermissions.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) throw new ForbiddenException('Access denied');

    // Company SUPER_ADMIN bypasses all permission checks
    if (user.role === CompanyRole.SUPER_ADMIN) return true;

    // School context only — resolve permissions lazily
    const schoolId = user.school_id ?? request.tenantId;
    if (!schoolId) throw new ForbiddenException('School context required');

    // Lazy-load PermissionsService to avoid circular dep
    const { PermissionsService } = await import('../../modules/permissions/permissions.service');
    const permissionsService = this.moduleRef.get(PermissionsService, { strict: false });

    const userPermissions = await permissionsService.resolveUserPermissions(
      user.sub,
      schoolId,
      user.custom_role_id ?? null,
      user.role,
    );

    const hasPermission = requiredPermissions.some((p) => userPermissions.includes(p));
    if (!hasPermission) {
      throw new ForbiddenException(
        `Missing required permission(s): ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
