import { Injectable, Inject } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { promotionLogs } from '../../database/drizzle/schema/promotion-logs.schema';
import { students } from '../../database/drizzle/schema/students.schema';
import { PromotionLog, NewPromotionLog } from './types/promotion.types';
import { PromotionFilterDto } from './dto/promotion-filter.dto';

@Injectable()
export class PromotionsRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  async bulkCreate(records: NewPromotionLog[]): Promise<PromotionLog[]> {
    return this.db.insert(promotionLogs).values(records).returning();
  }

  async findAll(schoolId: string, filters: PromotionFilterDto): Promise<PromotionLog[]> {
    const conditions = [eq(promotionLogs.school_id, schoolId)];

    if (filters.student_id) conditions.push(eq(promotionLogs.student_id, filters.student_id));
    if (filters.from_academic_year_id) conditions.push(eq(promotionLogs.from_academic_year_id, filters.from_academic_year_id));
    if (filters.to_academic_year_id) conditions.push(eq(promotionLogs.to_academic_year_id, filters.to_academic_year_id));
    if (filters.batch_id) conditions.push(eq(promotionLogs.batch_id, filters.batch_id));
    if (filters.status) conditions.push(eq(promotionLogs.status, filters.status));

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    return this.db
      .select()
      .from(promotionLogs)
      .where(and(...conditions))
      .orderBy(promotionLogs.created_at)
      .limit(limit)
      .offset((page - 1) * limit);
  }

  async count(schoolId: string, filters: PromotionFilterDto): Promise<number> {
    const conditions = [eq(promotionLogs.school_id, schoolId)];

    if (filters.student_id) conditions.push(eq(promotionLogs.student_id, filters.student_id));
    if (filters.from_academic_year_id) conditions.push(eq(promotionLogs.from_academic_year_id, filters.from_academic_year_id));
    if (filters.to_academic_year_id) conditions.push(eq(promotionLogs.to_academic_year_id, filters.to_academic_year_id));
    if (filters.batch_id) conditions.push(eq(promotionLogs.batch_id, filters.batch_id));
    if (filters.status) conditions.push(eq(promotionLogs.status, filters.status));

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(promotionLogs)
      .where(and(...conditions));

    return Number(count);
  }

  async updateStudentPromotion(
    studentId: string,
    schoolId: string,
    toAcademicYearId: string,
    toClassId: string,
    toSectionId: string | undefined,
    toRollNumber: string | undefined,
  ): Promise<void> {
    // await this.db
    //   .update(students)
    //   .set({
    //     academic_year_id: toAcademicYearId,
    //     class_id: toClassId,
    //     section_id: toSectionId ?? null,
    //     roll_number: toRollNumber ?? null,
    //     updated_at: new Date(),
    //   })
    //   .where(and(eq(students.id, studentId), eq(students.school_id, schoolId)));
  }

  async updateLogStatus(id: string, status: string): Promise<void> {
    await this.db
      .update(promotionLogs)
      .set({ status: status as any, updated_at: new Date() })
      .where(eq(promotionLogs.id, id));
  }
}
