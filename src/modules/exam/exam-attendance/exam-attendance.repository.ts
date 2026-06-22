import { Injectable, Inject } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../../database/drizzle/drizzle.provider';
import { ExamAttendance, NewExamAttendance } from './types/exam-attendance.types';
import { FilterAttendanceDto } from './dto/exam-attendance.dto';
import { examAttendance } from '@database/drizzle/schema/exam-attendance.schema';

@Injectable()
export class ExamAttendanceRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  private buildConditions(schoolId: string, filters: FilterAttendanceDto) {
    const conditions = [eq(examAttendance.school_id, schoolId), eq(examAttendance.deleted, false)];
    if (filters.academic_year_id)
      conditions.push(eq(examAttendance.academic_year_id, filters.academic_year_id));
    if (filters.exam_id) conditions.push(eq(examAttendance.exam_id, filters.exam_id));
    if (filters.schedule_id) conditions.push(eq(examAttendance.schedule_id, filters.schedule_id));
    if (filters.student_id) conditions.push(eq(examAttendance.student_id, filters.student_id));
    if (filters.status) conditions.push(eq(examAttendance.status, filters.status));
    return conditions;
  }

  async findAll(schoolId: string, filters: FilterAttendanceDto): Promise<ExamAttendance[]> {
    const conditions = this.buildConditions(schoolId, filters);
    const limit = filters.limit ?? 100;
    const offset = ((filters.page ?? 1) - 1) * limit;
    return this.db
      .select()
      .from(examAttendance)
      .where(and(...conditions))
      .orderBy(examAttendance.created_at)
      .limit(limit)
      .offset(offset);
  }

  async count(schoolId: string, filters: FilterAttendanceDto): Promise<number> {
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(examAttendance)
      .where(and(...this.buildConditions(schoolId, filters)));
    return Number(count);
  }

  async findExisting(
    schoolId: string,
    studentId: string,
    scheduleId: string,
  ): Promise<ExamAttendance | undefined> {
    const [row] = await this.db
      .select()
      .from(examAttendance)
      .where(
        and(
          eq(examAttendance.school_id, schoolId),
          eq(examAttendance.student_id, studentId),
          eq(examAttendance.schedule_id, scheduleId),
          eq(examAttendance.deleted, false),
        ),
      );
    return row;
  }

  async upsertMany(rows: NewExamAttendance[]): Promise<ExamAttendance[]> {
    // ON CONFLICT: update status + remarks using Drizzle's onConflictDoUpdate
    const result = await this.db
      .insert(examAttendance)
      .values(rows)
      .onConflictDoUpdate({
        target: [examAttendance.student_id, examAttendance.schedule_id],
        set: {
          status: sql`excluded.status`,
          remarks: sql`excluded.remarks`,
          updated_at: new Date(),
        },
      })
      .returning();
    return result;
  }

  async findBySchedule(scheduleId: string, schoolId: string): Promise<ExamAttendance[]> {
    return this.db
      .select()
      .from(examAttendance)
      .where(
        and(
          eq(examAttendance.schedule_id, scheduleId),
          eq(examAttendance.school_id, schoolId),
          eq(examAttendance.deleted, false),
        ),
      );
  }
}
