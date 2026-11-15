import { ForbiddenException, Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PermissionsRepository } from './permissions.repository';
import { RedisService } from '../redis/redis.service';
import { ALL_PERMISSIONS } from '../../shared/constants/permissions.registry';
import { generateId } from '../../utils/uuid.utils';
import { CacheTTL } from '../../shared/constants';
import { AuthContext, CompanyRole } from '../../shared/enums';
import { JwtPayload } from '../../shared/types/jwt-payload.types';

const COMPANY_ROLES: string[] = Object.values(CompanyRole);

@Injectable()
export class PermissionsService implements OnModuleInit {
  private readonly logger = new Logger(PermissionsService.name);

  constructor(
    private readonly permissionsRepo: PermissionsRepository,
    private readonly redisService: RedisService,
  ) {}

  async onModuleInit() {
    await this.seedPermissions();
  }

  private async seedPermissions() {
    const data = ALL_PERMISSIONS.map((slug) => {
      const [resource, action] = slug.split('.');
      return {
        id: generateId(),
        name: slug,
        display_name: `${this.capitalize(resource)} — ${this.capitalize(action)}`,
        resource,
        action,
      };
    });
    await this.permissionsRepo.upsertMany(data);
    this.logger.log(`Seeded ${data.length} permissions`);
  }

  /** Flat list of every permission slug — used to grant a SUPER_ADMIN full access when impersonating a school. */
  async getAllPermissionSlugs(): Promise<string[]> {
    const rows = await this.permissionsRepo.findAll();
    return rows.map((r) => r.name);
  }

  async findAll() {
    const rows = await this.permissionsRepo.findAll();
    const grouped: Record<
      string,
      { id: string; name: string; display_name: string; action: string }[]
    > = {};
    for (const row of rows) {
      if (!grouped[row.resource]) grouped[row.resource] = [];
      grouped[row.resource].push({
        id: row.id,
        name: row.name,
        display_name: row.display_name,
        action: row.action,
      });
    }
    return grouped;
  }

  /**
   * Permissions a caller holds in a school, or 'all' when they bypass the matrix:
   * SUPER_ADMIN, parents (scoped by ParentScopeGuard instead), and company users
   * impersonating a school they were already allowed into via switchSchool.
   */
  async grantedPermissions(
    user: JwtPayload,
    schoolId: string | undefined,
  ): Promise<'all' | string[]> {
    if (user.role === CompanyRole.SUPER_ADMIN) return 'all';
    if (user.context === AuthContext.PARENT) return 'all';
    if (
      COMPANY_ROLES.includes(user.role) &&
      user.context === AuthContext.SCHOOL &&
      user.school_id
    ) {
      return 'all';
    }
    if (!schoolId) throw new ForbiddenException('School context required');
    return this.resolveUserPermissions(user.sub, schoolId, user.custom_role_id ?? null, user.role);
  }

  /**
   * Resolve permissions for a user.
   * - custom_role_id present  → permissions from that role in DB
   * - fallback via enumRole slug → look up system role by slug in DB
   */
  async resolveUserPermissions(
    userId: string,
    schoolId: string,
    customRoleId: string | null | undefined,
    enumRoleSlug?: string,
  ): Promise<string[]> {
    const cacheKey = `user_permissions:${userId}:${schoolId}`;
    return this.redisService.getOrSet(cacheKey, CacheTTL.MEDIUM, async () => {
      if (customRoleId) {
        return this.permissionsRepo.findPermissionsByRoleId(customRoleId);
      }

      if (enumRoleSlug) {
        const slug = enumRoleSlug.toLowerCase();
        const roleId = await this.permissionsRepo.findRoleIdBySlug(schoolId, slug);
        if (roleId) {
          return this.permissionsRepo.findPermissionsByRoleId(roleId);
        }
      }

      return [];
    });
  }

  async invalidateSchoolPermissionCache(schoolId: string): Promise<void> {
    await this.redisService.delByPattern(`user_permissions:*:${schoolId}`);
  }

  async invalidateUserPermissionCache(userId: string, schoolId: string): Promise<void> {
    await this.redisService.del(`user_permissions:${userId}:${schoolId}`);
  }

  private capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}
