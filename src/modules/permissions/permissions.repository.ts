import { Injectable, Inject } from '@nestjs/common';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { permissions, rolePermissions } from '../../database/drizzle/schema';
import { roles } from '../../database/drizzle/schema/roles.schema';

@Injectable()
export class PermissionsRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  async findAll() {
    return this.db.select().from(permissions).orderBy(permissions.resource, permissions.action);
  }

  async findByName(name: string) {
    const [row] = await this.db.select().from(permissions).where(eq(permissions.name, name));
    return row;
  }

  async findByNames(names: string[]) {
    if (!names.length) return [];
    return this.db.select().from(permissions).where(inArray(permissions.name, names));
  }

  async upsertMany(
    data: { id: string; name: string; display_name: string; resource: string; action: string }[],
  ) {
    if (!data.length) return;
    await this.db
      .insert(permissions)
      .values(data)
      .onConflictDoUpdate({
        target: permissions.name,
        set: {
          display_name: sql`excluded.display_name`,
          resource: sql`excluded.resource`,
          action: sql`excluded.action`,
        },
      });
  }

  async findPermissionsByRoleId(roleId: string): Promise<string[]> {
    const rows = await this.db
      .select({ name: permissions.name })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permission_id, permissions.id))
      .where(eq(rolePermissions.role_id, roleId));
    return rows.map((r) => r.name);
  }

  async setRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
    await this.db.delete(rolePermissions).where(eq(rolePermissions.role_id, roleId));
    if (permissionIds.length) {
      await this.db
        .insert(rolePermissions)
        .values(permissionIds.map((pid) => ({ role_id: roleId, permission_id: pid })));
    }
  }

  async findById(id: string) {
    const [row] = await this.db.select().from(permissions).where(eq(permissions.id, id));
    return row;
  }

  async findByIds(ids: string[]) {
    if (!ids.length) return [];
    return this.db.select().from(permissions).where(inArray(permissions.id, ids));
  }

  async findRoleIdBySlug(schoolId: string, slug: string): Promise<string | null> {
    const [role] = await this.db
      .select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.school_id, schoolId), eq(roles.slug, slug), eq(roles.deleted, false)))
      .limit(1);
    return role?.id ?? null;
  }
}
