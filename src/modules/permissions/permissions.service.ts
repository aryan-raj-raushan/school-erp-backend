import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PermissionsRepository } from './permissions.repository';
import { RedisService } from '../redis/redis.service';
import { ALL_PERMISSIONS } from '../../shared/constants/permissions.registry';
import { generateId } from '../../utils/uuid.utils';
import { CacheTTL } from '../../shared/constants';

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
