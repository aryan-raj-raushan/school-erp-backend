import { Injectable, Inject } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { roles } from '../../database/drizzle/schema/roles.schema';
import { Role, NewRole } from './types/role.types';
import { FilterRoleDto } from './dto/filter-role.dto';

@Injectable()
export class RolesRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  private buildConditions(schoolId: string, filters: Partial<FilterRoleDto> = {}) {
    const conditions = [eq(roles.school_id, schoolId), eq(roles.deleted, false)];
    if (filters.is_active !== undefined) conditions.push(eq(roles.is_active, filters.is_active));
    return conditions;
  }

  async findAll(schoolId: string, filters: FilterRoleDto): Promise<Role[]> {
    const limit = filters.limit ?? 50;
    const offset = ((filters.page ?? 1) - 1) * limit;
    return this.db
      .select()
      .from(roles)
      .where(and(...this.buildConditions(schoolId, filters)))
      .orderBy(roles.name)
      .limit(limit)
      .offset(offset);
  }

  async count(schoolId: string, filters: FilterRoleDto): Promise<number> {
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(roles)
      .where(and(...this.buildConditions(schoolId, filters)));
    return Number(count);
  }

  async findById(id: string, schoolId: string): Promise<Role | undefined> {
    const [row] = await this.db
      .select()
      .from(roles)
      .where(and(eq(roles.id, id), eq(roles.school_id, schoolId), eq(roles.deleted, false)));
    return row;
  }

  async findBySlug(slug: string, schoolId: string): Promise<Role | undefined> {
    const [row] = await this.db
      .select()
      .from(roles)
      .where(and(eq(roles.slug, slug), eq(roles.school_id, schoolId), eq(roles.deleted, false)));
    return row;
  }

  async create(data: NewRole): Promise<Role> {
    const [row] = await this.db.insert(roles).values(data).returning();
    return row;
  }

  async upsertSystemRole(data: NewRole): Promise<void> {
    await this.db
      .insert(roles)
      .values(data)
      .onConflictDoUpdate({
        target: [roles.school_id, roles.slug],
        set: {
          name: data.name,
          description: data.description,
          is_active: true,
          deleted: false,
          updated_at: new Date(),
        },
      });
  }

  async update(id: string, schoolId: string, data: Partial<NewRole>): Promise<Role | undefined> {
    const payload = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined),
    ) as Partial<NewRole>;
    const [row] = await this.db
      .update(roles)
      .set({ ...payload, updated_at: new Date() })
      .where(and(eq(roles.id, id), eq(roles.school_id, schoolId)))
      .returning();
    return row;
  }

  async softDelete(id: string, schoolId: string): Promise<void> {
    await this.db
      .update(roles)
      .set({ deleted: true, is_active: false, updated_at: new Date() })
      .where(and(eq(roles.id, id), eq(roles.school_id, schoolId)));
  }
}
