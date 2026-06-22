import { Injectable, Inject } from '@nestjs/common';
import { eq, and, sql, or } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../../database/drizzle/drizzle.provider';
import { ExamSchedule, NewExamSchedule } from './types/exam-schedule.types';
import { FilterExamScheduleDto } from './dto/exam-schedule.dto';
import { examSchedules } from '@database/drizzle/schema/exam-schedule.schema';

@Injectable()
export class ExamScheduleRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  private buildConditions(schoolId: string, filters: FilterExamScheduleDto) {
    const conditions = [eq(examSchedules.school_id, schoolId), eq(examSchedules.deleted, false)];

    if (filters.academic_year_id)
      conditions.push(eq(examSchedules.academic_year_id, filters.academic_year_id));
    if (filters.class_id) conditions.push(eq(examSchedules.class_id, filters.class_id));
    if (filters.exam_id) conditions.push(eq(examSchedules.exam_id, filters.exam_id));
    if (filters.subject_id) conditions.push(eq(examSchedules.subject_id, filters.subject_id));
    if (filters.subject_type) conditions.push(eq(examSchedules.subject_type, filters.subject_type));
    if (filters.exam_date) conditions.push(eq(examSchedules.exam_date, filters.exam_date));

    return conditions;
  }

  async findAll(schoolId: string, filters: FilterExamScheduleDto): Promise<ExamSchedule[]> {
    const conditions = this.buildConditions(schoolId, filters);
    const limit = filters.limit ?? 50;
    const offset = ((filters.page ?? 1) - 1) * limit;

    return this.db
      .select()
      .from(examSchedules)
      .where(and(...conditions))
      .orderBy(examSchedules.exam_date, examSchedules.start_time)
      .limit(limit)
      .offset(offset);
  }

  async count(schoolId: string, filters: FilterExamScheduleDto): Promise<number> {
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(examSchedules)
      .where(and(...this.buildConditions(schoolId, filters)));
    return Number(count);
  }

  async findById(id: string, schoolId: string): Promise<ExamSchedule | undefined> {
    const [row] = await this.db
      .select()
      .from(examSchedules)
      .where(
        and(
          eq(examSchedules.id, id),
          eq(examSchedules.school_id, schoolId),
          eq(examSchedules.deleted, false),
        ),
      );
    return row;
  }

  /**
   * Detect time conflicts: same school / exam / class, same date, overlapping time slot.
   * Excludes a given id (useful when updating).
   */
  async findConflict(
    schoolId: string,
    examId: string,
    classId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeId?: string,
  ): Promise<ExamSchedule[]> {
    const conditions = [
      eq(examSchedules.school_id, schoolId),
      eq(examSchedules.exam_id, examId),
      eq(examSchedules.class_id, classId),
      eq(examSchedules.exam_date, date),
      eq(examSchedules.deleted, false),
      // overlap: existing.start < new.end AND existing.end > new.start
      sql`${examSchedules.start_time} < ${endTime}::time`,
      sql`${examSchedules.end_time} > ${startTime}::time`,
    ];

    const rows = await this.db
      .select()
      .from(examSchedules)
      .where(and(...conditions));

    return excludeId ? rows.filter((r) => r.id !== excludeId) : rows;
  }

  /**
   * Check if the same subject is already scheduled for this exam/class.
   */
  async findDuplicate(
    schoolId: string,
    examId: string,
    classId: string,
    subjectId: string,
    excludeId?: string,
  ): Promise<ExamSchedule | undefined> {
    const rows = await this.db
      .select()
      .from(examSchedules)
      .where(
        and(
          eq(examSchedules.school_id, schoolId),
          eq(examSchedules.exam_id, examId),
          eq(examSchedules.class_id, classId),
          eq(examSchedules.subject_id, subjectId),
          eq(examSchedules.deleted, false),
        ),
      );
    const filtered = excludeId ? rows.filter((r) => r.id !== excludeId) : rows;
    return filtered[0];
  }

  async findByParentId(parentId: string, schoolId: string): Promise<ExamSchedule[]> {
    return this.db
      .select()
      .from(examSchedules)
      .where(
        and(
          eq(examSchedules.parent_schedule_id, parentId),
          eq(examSchedules.school_id, schoolId),
          eq(examSchedules.deleted, false),
        ),
      );
  }

  async createMany(data: NewExamSchedule[]): Promise<ExamSchedule[]> {
    return this.db.insert(examSchedules).values(data).returning();
  }

  async create(data: NewExamSchedule): Promise<ExamSchedule> {
    const [row] = await this.db.insert(examSchedules).values(data).returning();
    return row;
  }

  async update(
    id: string,
    schoolId: string,
    data: Partial<NewExamSchedule>,
  ): Promise<ExamSchedule> {
    const [row] = await this.db
      .update(examSchedules)
      .set({ ...data, updated_at: new Date() })
      .where(and(eq(examSchedules.id, id), eq(examSchedules.school_id, schoolId)))
      .returning();
    return row;
  }

  async softDelete(id: string, schoolId: string): Promise<void> {
    // Also delete sub-schedules
    await this.db
      .update(examSchedules)
      .set({ deleted: true, updated_at: new Date() })
      .where(
        and(
          or(eq(examSchedules.id, id), eq(examSchedules.parent_schedule_id, id))!,
          eq(examSchedules.school_id, schoolId),
        ),
      );
  }
}
