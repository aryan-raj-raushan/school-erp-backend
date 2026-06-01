import { Injectable, Inject } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { students } from '../../database/drizzle/schema/students.schema';
import { schoolUsers } from '../../database/drizzle/schema/school-users.schema';
import { attendances } from '../../database/drizzle/schema/attendance.schema';
import { feeReceipts } from '../../database/drizzle/schema/fees.schema';
import { homeworks } from '../../database/drizzle/schema/academics.schema';
import { exams } from '../../database/drizzle/schema/exams.schema';

@Injectable()
export class DashboardRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  async countStudents(schoolId: string): Promise<number> {
    const [{ count }] = await this.db.select({ count: sql<number>`count(*)` }).from(students).where(and(eq(students.school_id, schoolId), eq(students.deleted, false)));
    return Number(count);
  }

  async countStaff(schoolId: string): Promise<number> {
    const [{ count }] = await this.db.select({ count: sql<number>`count(*)` }).from(schoolUsers).where(and(eq(schoolUsers.school_id, schoolId), eq(schoolUsers.deleted, false)));
    return Number(count);
  }

  async getTodayAttendanceSummary(schoolId: string, date: string) {
    const results = await this.db
      .select({ status: attendances.status, count: sql<number>`count(*)` })
      .from(attendances)
      .where(and(eq(attendances.school_id, schoolId), eq(attendances.date, date)))
      .groupBy(attendances.status);
    return results;
  }

  async getPendingFees(schoolId: string): Promise<number> {
    const [{ count }] = await this.db.select({ count: sql<number>`count(*)` }).from(feeReceipts).where(and(eq(feeReceipts.school_id, schoolId), eq(feeReceipts.status, 'PENDING')));
    return Number(count);
  }

  async getRecentHomework(schoolId: string, limit = 5) {
    return this.db.select().from(homeworks).where(and(eq(homeworks.school_id, schoolId), eq(homeworks.deleted, false))).orderBy(homeworks.created_at).limit(limit);
  }

  async getUpcomingExams(schoolId: string, limit = 5) {
    return this.db.select().from(exams).where(and(eq(exams.school_id, schoolId), eq(exams.deleted, false))).orderBy(exams.start_date).limit(limit);
  }

  async getTeacherAssignedHomework(schoolId: string, teacherId: string, limit = 5) {
    return this.db.select().from(homeworks).where(and(eq(homeworks.school_id, schoolId), eq(homeworks.assigned_by, teacherId), eq(homeworks.deleted, false))).orderBy(homeworks.created_at).limit(limit);
  }

  async getSubjectAllocation(schoolId: string, classSectionId: string) {
    return this.db
      .select({ subject_id: homeworks.subject_id, count: sql<number>`count(*)` })
      .from(homeworks)
      .where(and(eq(homeworks.school_id, schoolId), eq(homeworks.class_section_id, classSectionId), eq(homeworks.deleted, false)))
      .groupBy(homeworks.subject_id);
  }
}
