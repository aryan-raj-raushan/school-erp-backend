import { Injectable, Inject } from '@nestjs/common';
import { eq, and, ilike, sql, inArray } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { schools, companyUserSchools } from '../../database/drizzle/schema';
import { School, NewSchool } from './types/school.types';
import { SchoolFilterDto } from './dto/school-filter.dto';

@Injectable()
export class SchoolsRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  async findAll(filters: SchoolFilterDto, allowedIds?: string[]): Promise<School[]> {
    const conditions = [eq(schools.deleted, false)];

    if (allowedIds) {
      if (allowedIds.length === 0) return [];
      conditions.push(inArray(schools.id, allowedIds));
    }
    if (filters.search) conditions.push(ilike(schools.name, `%${filters.search}%`));
    if (filters.board_type) conditions.push(eq(schools.board_type, filters.board_type));
    if (filters.is_active !== undefined) conditions.push(eq(schools.is_active, filters.is_active));

    const limit = filters.limit ?? 20;
    const offset = ((filters.page ?? 1) - 1) * limit;

    return this.db
      .select()
      .from(schools)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset);
  }

  async count(filters: SchoolFilterDto, allowedIds?: string[]): Promise<number> {
    const conditions = [eq(schools.deleted, false)];
    if (allowedIds) {
      if (allowedIds.length === 0) return 0;
      conditions.push(inArray(schools.id, allowedIds));
    }
    if (filters.search) conditions.push(ilike(schools.name, `%${filters.search}%`));
    if (filters.board_type) conditions.push(eq(schools.board_type, filters.board_type));
    if (filters.is_active !== undefined) conditions.push(eq(schools.is_active, filters.is_active));

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schools)
      .where(and(...conditions));
    return Number(count);
  }

  async findById(id: string): Promise<School | undefined> {
    const [row] = await this.db
      .select()
      .from(schools)
      .where(and(eq(schools.id, id), eq(schools.deleted, false)));
    return row;
  }

  async findByCode(code: string): Promise<School | undefined> {
    const [row] = await this.db
      .select()
      .from(schools)
      .where(and(eq(schools.code, code), eq(schools.deleted, false)));
    return row;
  }

  async create(data: NewSchool): Promise<School> {
    const [row] = await this.db.insert(schools).values(data).returning();
    return row;
  }

  async update(id: string, data: Partial<NewSchool>): Promise<School> {
    const [row] = await this.db
      .update(schools)
      .set({ ...data, updated_at: new Date() })
      .where(eq(schools.id, id))
      .returning();
    return row;
  }

  async softDelete(id: string): Promise<void> {
    await this.db
      .update(schools)
      .set({ deleted: true, is_active: false, updated_at: new Date() })
      .where(eq(schools.id, id));
  }

  async findSchoolIdsByCompanyUserId(userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ school_id: companyUserSchools.school_id })
      .from(companyUserSchools)
      .where(eq(companyUserSchools.user_id, userId));
    return rows.map((r) => r.school_id);
  }
}
