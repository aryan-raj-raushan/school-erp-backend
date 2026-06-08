import { Injectable, Inject } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { classDetails } from '../../database/drizzle/schema';
import { ClassDetail, NewClassDetail } from './types/class-detail.types';
import { FilterClassDetailDto } from './dto/filter-class-detail.dto';

@Injectable()
export class ClassDetailsRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  private buildConditions(schoolId: string, filters: Partial<FilterClassDetailDto> = {}) {
    const conditions = [
      eq(classDetails.school_id, schoolId),
      eq(classDetails.deleted, false),
    ];
    if (filters.class_id) conditions.push(eq(classDetails.class_id, filters.class_id));
    if (filters.year) conditions.push(eq(classDetails.year, filters.year));
    return conditions;
  }

  async findAll(schoolId: string, filters: FilterClassDetailDto): Promise<ClassDetail[]> {
    const limit = filters.limit ?? 20;
    const offset = ((filters.page ?? 1) - 1) * limit;
    return this.db
      .select()
      .from(classDetails)
      .where(and(...this.buildConditions(schoolId, filters)))
      .orderBy(classDetails.name)
      .limit(limit)
      .offset(offset);
  }

  async count(schoolId: string, filters: FilterClassDetailDto): Promise<number> {
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(classDetails)
      .where(and(...this.buildConditions(schoolId, filters)));
    return Number(count);
  }

  async findById(id: string, schoolId: string): Promise<ClassDetail | undefined> {
    const [row] = await this.db
      .select()
      .from(classDetails)
      .where(and(eq(classDetails.id, id), eq(classDetails.school_id, schoolId), eq(classDetails.deleted, false)));
    return row;
  }

  async create(data: NewClassDetail): Promise<ClassDetail> {
    const [row] = await this.db.insert(classDetails).values(data).returning();
    return row;
  }

  async update(id: string, schoolId: string, data: Partial<NewClassDetail>): Promise<ClassDetail> {
    const [row] = await this.db
      .update(classDetails)
      .set({ ...data, updated_at: new Date() })
      .where(and(eq(classDetails.id, id), eq(classDetails.school_id, schoolId)))
      .returning();
    return row;
  }

  async softDelete(id: string, schoolId: string): Promise<void> {
    await this.db
      .update(classDetails)
      .set({ deleted: true, is_enabled: false, updated_at: new Date() })
      .where(and(eq(classDetails.id, id), eq(classDetails.school_id, schoolId)));
  }
}
