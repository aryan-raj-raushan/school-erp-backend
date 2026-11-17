import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, ne, sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { companyRoles, companyUsers, CompanyRoleRow } from '../../database/drizzle/schema';

@Injectable()
export class CompanyRolesRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  findAll() {
    return this.db
      .select({
        id: companyRoles.id,
        name: companyRoles.name,
        description: companyRoles.description,
        permissions: companyRoles.permissions,
        created_at: companyRoles.created_at,
        updated_at: companyRoles.updated_at,
        member_count: sql<number>`(
          select count(*)::int from ${companyUsers}
          where ${companyUsers.company_role_id} = ${companyRoles.id} and ${companyUsers.deleted} = false
        )`,
      })
      .from(companyRoles)
      .orderBy(asc(companyRoles.name));
  }

  async findById(id: string): Promise<CompanyRoleRow | undefined> {
    const [row] = await this.db.select().from(companyRoles).where(eq(companyRoles.id, id)).limit(1);
    return row;
  }

  async nameTaken(name: string, excludeId?: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: companyRoles.id })
      .from(companyRoles)
      .where(
        and(
          sql`lower(${companyRoles.name}) = lower(${name})`,
          excludeId ? ne(companyRoles.id, excludeId) : undefined,
        ),
      )
      .limit(1);
    return !!row;
  }

  async create(data: typeof companyRoles.$inferInsert): Promise<CompanyRoleRow> {
    const [row] = await this.db.insert(companyRoles).values(data).returning();
    return row;
  }

  async update(
    id: string,
    data: Partial<Pick<CompanyRoleRow, 'name' | 'description' | 'permissions'>>,
  ): Promise<CompanyRoleRow> {
    const [row] = await this.db
      .update(companyRoles)
      .set({ ...data, updated_at: new Date() })
      .where(eq(companyRoles.id, id))
      .returning();
    return row;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(companyRoles).where(eq(companyRoles.id, id));
  }

  async countMembers(id: string): Promise<number> {
    const [row] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(companyUsers)
      .where(and(eq(companyUsers.company_role_id, id), eq(companyUsers.deleted, false)));
    return row?.total ?? 0;
  }

  async findUserRole(
    userId: string,
  ): Promise<{ id: string; name: string; permissions: string[] } | null> {
    const [row] = await this.db
      .select({
        id: companyRoles.id,
        name: companyRoles.name,
        permissions: companyRoles.permissions,
      })
      .from(companyUsers)
      .innerJoin(companyRoles, eq(companyRoles.id, companyUsers.company_role_id))
      .where(eq(companyUsers.id, userId))
      .limit(1);
    return row ?? null;
  }
}
