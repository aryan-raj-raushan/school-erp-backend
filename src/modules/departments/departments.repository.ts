import { Injectable, Inject } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { departments } from '../../database/drizzle/schema/departments.schema';
import { Department, NewDepartment } from './types/department.types';
import { FilterDepartmentDto } from './dto/filter-department.dto';

@Injectable()
export class DepartmentsRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  private buildConditions(schoolId: string, filters: Partial<FilterDepartmentDto> = {}) {
    const conditions = [eq(departments.school_id, schoolId), eq(departments.deleted, false)];
    if (filters.is_active !== undefined) conditions.push(eq(departments.is_active, filters.is_active));
    return conditions;
  }

  async findAll(schoolId: string, filters: FilterDepartmentDto): Promise<Department[]> {
    const limit = filters.limit ?? 20;
    const offset = ((filters.page ?? 1) - 1) * limit;
    return this.db
      .select()
      .from(departments)
      .where(and(...this.buildConditions(schoolId, filters)))
      .orderBy(departments.name)
      .limit(limit)
      .offset(offset);
  }

  async count(schoolId: string, filters: FilterDepartmentDto): Promise<number> {
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(departments)
      .where(and(...this.buildConditions(schoolId, filters)));
    return Number(count);
  }

  async findById(id: string, schoolId: string): Promise<Department | undefined> {
    const [row] = await this.db
      .select()
      .from(departments)
      .where(and(eq(departments.id, id), eq(departments.school_id, schoolId), eq(departments.deleted, false)));
    return row;
  }

  async create(data: NewDepartment): Promise<Department> {
    const [row] = await this.db.insert(departments).values(data).returning();
    return row;
  }

  async update(id: string, schoolId: string, data: Partial<NewDepartment>): Promise<Department | undefined> {
    const [row] = await this.db
      .update(departments)
      .set({ ...data, updated_at: new Date() })
      .where(and(eq(departments.id, id), eq(departments.school_id, schoolId)))
      .returning();
    return row;
  }

  async softDelete(id: string, schoolId: string): Promise<void> {
    await this.db
      .update(departments)
      .set({ deleted: true, is_active: false, updated_at: new Date() })
      .where(and(eq(departments.id, id), eq(departments.school_id, schoolId)));
  }
}
