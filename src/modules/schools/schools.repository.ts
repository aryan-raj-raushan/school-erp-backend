import { Injectable, Inject } from '@nestjs/common';
import { eq, and, ilike, sql, inArray, asc } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { schools, companyUserSchools } from '../../database/drizzle/schema';
import { School, NewSchool } from './types/school.types';
import { SchoolFilterDto } from './dto/school-filter.dto';

const PURGE_MAX_PASSES = 10;
const FOREIGN_KEY_VIOLATION = '23503';

export interface SchoolDataCounts {
  students: number;
  staff: number;
  parents: number;
}

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
      .orderBy(asc(schools.name), asc(schools.id))
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

  async findCodesWithPrefix(prefix: string): Promise<string[]> {
    const rows = await this.db
      .select({ code: schools.code })
      .from(schools)
      .where(ilike(schools.code, `${prefix}%`));
    return rows.map((r) => r.code).filter((c): c is string => !!c);
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

  async findByName(name: string): Promise<School | undefined> {
    const [row] = await this.db
      .select()
      .from(schools)
      .where(and(sql`lower(${schools.name}) = lower(${name})`, eq(schools.deleted, false)))
      .limit(1);
    return row;
  }

  async findSchoolIdsByCompanyUserId(userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ school_id: companyUserSchools.school_id })
      .from(companyUserSchools)
      .where(eq(companyUserSchools.user_id, userId));
    return rows.map((r) => r.school_id);
  }

  async clearRestriction(schoolId: string): Promise<void> {
    await this.db
      .update(schools)
      .set({
        restriction_level: 'NONE',
        restriction_applied_at: null,
        restriction_reason: null,
        updated_at: new Date(),
      })
      .where(eq(schools.id, schoolId));
  }

  async countSchoolData(schoolId: string): Promise<SchoolDataCounts> {
    const result = await this.db.execute<{ students: string; staff: string; parents: string }>(sql`
      SELECT
        (SELECT count(*) FROM students WHERE school_id = ${schoolId}) AS students,
        (SELECT count(*) FROM school_users WHERE school_id = ${schoolId}) AS staff,
        (SELECT count(*) FROM student_parents WHERE school_id = ${schoolId}) AS parents
    `);
    const row = result.rows[0];
    return {
      students: Number(row?.students ?? 0),
      staff: Number(row?.staff ?? 0),
      parents: Number(row?.parents ?? 0),
    };
  }

  async purgeSchoolData(schoolId: string): Promise<{ tables: number; rows: number }> {
    return this.db.transaction(async (tx) => {
      const tableResult = await tx.execute<{ table_name: string }>(sql`
        SELECT DISTINCT c.table_name
        FROM information_schema.columns c
        JOIN information_schema.tables t
          ON t.table_schema = c.table_schema AND t.table_name = c.table_name
        WHERE c.table_schema = 'public'
          AND c.column_name = 'school_id'
          AND t.table_type = 'BASE TABLE'
          AND c.table_name <> 'schools'
      `);
      const remaining = new Set(tableResult.rows.map((r) => r.table_name));
      const tableCount = remaining.size;
      let rows = 0;
      let blockedBy = '';

      for (let pass = 0; pass < PURGE_MAX_PASSES && remaining.size; pass++) {
        const before = remaining.size;
        for (const table of [...remaining]) {
          try {
            const deleted = await tx.transaction((sp) =>
              sp.execute(sql`DELETE FROM ${sql.identifier(table)} WHERE school_id = ${schoolId}`),
            );
            rows += deleted.rowCount ?? 0;
            remaining.delete(table);
          } catch (error) {
            if ((error as { code?: string }).code !== FOREIGN_KEY_VIOLATION) throw error;
            blockedBy = `${table}: ${(error as Error).message}`;
          }
        }
        if (remaining.size === before) break;
      }

      if (remaining.size) {
        throw new Error(`Could not delete school data — ${blockedBy}`);
      }

      const deletedSchool = await tx.delete(schools).where(eq(schools.id, schoolId));
      rows += deletedSchool.rowCount ?? 0;
      return { tables: tableCount, rows };
    });
  }
}
