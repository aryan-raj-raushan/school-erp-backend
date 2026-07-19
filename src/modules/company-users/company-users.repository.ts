import { Injectable, Inject } from '@nestjs/common';
import { eq, and, ilike, sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { companyUsers, companyUserSchools, schools } from '../../database/drizzle/schema';
import { CompanyUserFilterDto } from './dto/company-user-filter.dto';
import { CompanyUserProfile, AssignedSchool } from './types/company-user.types';
import { generateId } from '../../utils/uuid.utils';
import { CompanyRole } from '../../shared/enums';

const PROFILE_COLUMNS = {
  id: companyUsers.id,
  first_name: companyUsers.first_name,
  last_name: companyUsers.last_name,
  email: companyUsers.email,
  role: companyUsers.role,
  is_active: companyUsers.is_active,
  deleted: companyUsers.deleted,
  last_login_at: companyUsers.last_login_at,
  created_at: companyUsers.created_at,
  updated_at: companyUsers.updated_at,
};

@Injectable()
export class CompanyUsersRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  async findAll(filters: CompanyUserFilterDto): Promise<CompanyUserProfile[]> {
    const conditions = [eq(companyUsers.deleted, false)];
    if (filters.search) conditions.push(ilike(companyUsers.first_name, `%${filters.search}%`));
    if (filters.role) conditions.push(eq(companyUsers.role, filters.role));
    if (filters.is_active !== undefined)
      conditions.push(eq(companyUsers.is_active, filters.is_active));

    const limit = filters.limit ?? 20;
    const offset = ((filters.page ?? 1) - 1) * limit;

    return this.db
      .select(PROFILE_COLUMNS)
      .from(companyUsers)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset);
  }

  async count(filters: CompanyUserFilterDto): Promise<number> {
    const conditions = [eq(companyUsers.deleted, false)];
    if (filters.search) conditions.push(ilike(companyUsers.first_name, `%${filters.search}%`));
    if (filters.role) conditions.push(eq(companyUsers.role, filters.role));
    if (filters.is_active !== undefined)
      conditions.push(eq(companyUsers.is_active, filters.is_active));

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(companyUsers)
      .where(and(...conditions));
    return Number(count);
  }

  async findById(id: string): Promise<CompanyUserProfile | undefined> {
    const [row] = await this.db
      .select(PROFILE_COLUMNS)
      .from(companyUsers)
      .where(and(eq(companyUsers.id, id), eq(companyUsers.deleted, false)));
    return row;
  }

  async update(
    id: string,
    data: Partial<{ first_name: string; last_name: string; role: CompanyRole; is_active: boolean }>,
  ): Promise<CompanyUserProfile> {
    const [row] = await this.db
      .update(companyUsers)
      .set({ ...data, updated_at: new Date() })
      .where(eq(companyUsers.id, id))
      .returning(PROFILE_COLUMNS);
    return row;
  }

  async softDelete(id: string): Promise<void> {
    await this.db
      .update(companyUsers)
      .set({ deleted: true, is_active: false, updated_at: new Date() })
      .where(eq(companyUsers.id, id));
  }

  async listSchoolsForUser(userId: string): Promise<AssignedSchool[]> {
    return this.db
      .select({
        school_id: companyUserSchools.school_id,
        school_name: schools.name,
        granted_by: companyUserSchools.granted_by,
        created_at: companyUserSchools.created_at,
      })
      .from(companyUserSchools)
      .innerJoin(schools, eq(schools.id, companyUserSchools.school_id))
      .where(eq(companyUserSchools.user_id, userId));
  }

  async assignSchool(userId: string, schoolId: string, grantedBy: string): Promise<void> {
    await this.db
      .insert(companyUserSchools)
      .values({ id: generateId(), user_id: userId, school_id: schoolId, granted_by: grantedBy })
      .onConflictDoNothing();
  }

  async unassignSchool(userId: string, schoolId: string): Promise<void> {
    await this.db
      .delete(companyUserSchools)
      .where(
        and(eq(companyUserSchools.user_id, userId), eq(companyUserSchools.school_id, schoolId)),
      );
  }
}
