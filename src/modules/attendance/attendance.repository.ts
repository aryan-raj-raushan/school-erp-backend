import { Injectable, Inject } from '@nestjs/common';
import { eq, and, gte, lte, sql, count as drizzleCount } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { attendances } from '../../database/drizzle/schema/attendance.schema';
import { students } from '../../database/drizzle/schema/students.schema';
import { Attendance, NewAttendance } from './types/attendance.types';
import { AttendanceFilterDto, StudentAttendanceFilterDto } from './dto/attendance-filter.dto';

@Injectable()
export class AttendanceRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  async findAll(schoolId: string, filters: AttendanceFilterDto): Promise<Attendance[]> {
    const { page = 1, limit = 20, class_section_id, date, academic_year_id } = filters;
    const offset = (page - 1) * limit;
    const conditions = [eq(attendances.school_id, schoolId)];

    if (class_section_id) conditions.push(eq(attendances.class_section_id, class_section_id));
    if (date) conditions.push(eq(attendances.date, date));
    if (academic_year_id) conditions.push(eq(attendances.academic_year_id, academic_year_id));

    return this.db
      .select()
      .from(attendances)
      .where(and(...conditions))
      .orderBy(attendances.date)
      .limit(limit)
      .offset(offset);
  }

  async findById(id: string, schoolId: string): Promise<Attendance | undefined> {
    const [row] = await this.db
      .select()
      .from(attendances)
      .where(and(eq(attendances.id, id), eq(attendances.school_id, schoolId)));
    return row;
  }

  async findByStudentAndDate(studentId: string, date: string, schoolId: string): Promise<Attendance | undefined> {
    const [row] = await this.db
      .select()
      .from(attendances)
      .where(
        and(
          eq(attendances.student_id, studentId),
          eq(attendances.date, date),
          eq(attendances.school_id, schoolId),
        ),
      );
    return row;
  }

  async upsert(data: NewAttendance): Promise<Attendance> {
    const [row] = await this.db
      .insert(attendances)
      .values(data)
      .onConflictDoUpdate({
        target: [attendances.student_id, attendances.date],
        set: { status: data.status, remarks: data.remarks, updated_at: new Date() },
      })
      .returning();
    return row;
  }

  async update(id: string, schoolId: string, data: Partial<NewAttendance>): Promise<Attendance> {
    const [row] = await this.db
      .update(attendances)
      .set({ ...data, updated_at: new Date() })
      .where(and(eq(attendances.id, id), eq(attendances.school_id, schoolId)))
      .returning();
    return row;
  }

  async remove(id: string, schoolId: string): Promise<void> {
    await this.db
      .delete(attendances)
      .where(and(eq(attendances.id, id), eq(attendances.school_id, schoolId)));
  }

  async getStudentHistory(studentId: string, schoolId: string, filters: StudentAttendanceFilterDto): Promise<Attendance[]> {
    const { page = 1, limit = 20, from_date, to_date, academic_year_id } = filters;
    const offset = (page - 1) * limit;
    const conditions = [eq(attendances.student_id, studentId), eq(attendances.school_id, schoolId)];

    if (from_date) conditions.push(gte(attendances.date, from_date));
    if (to_date) conditions.push(lte(attendances.date, to_date));
    if (academic_year_id) conditions.push(eq(attendances.academic_year_id, academic_year_id));

    return this.db
      .select()
      .from(attendances)
      .where(and(...conditions))
      .orderBy(attendances.date)
      .limit(limit)
      .offset(offset);
  }

  async getStudentHistoryCount(studentId: string, schoolId: string, filters: StudentAttendanceFilterDto): Promise<number> {
    const { from_date, to_date, academic_year_id } = filters;
    const conditions = [eq(attendances.student_id, studentId), eq(attendances.school_id, schoolId)];

    if (from_date) conditions.push(gte(attendances.date, from_date));
    if (to_date) conditions.push(lte(attendances.date, to_date));
    if (academic_year_id) conditions.push(eq(attendances.academic_year_id, academic_year_id));

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(attendances)
      .where(and(...conditions));
    return Number(count);
  }

  async getStudentSummary(studentId: string, schoolId: string, academic_year_id?: string) {
    const conditions = [eq(attendances.student_id, studentId), eq(attendances.school_id, schoolId)];
    if (academic_year_id) conditions.push(eq(attendances.academic_year_id, academic_year_id));

    return this.db
      .select({
        status: attendances.status,
        count: sql<number>`count(*)`,
      })
      .from(attendances)
      .where(and(...conditions))
      .groupBy(attendances.status);
  }

  async getDailyReport(schoolId: string, classSectionId: string, date: string): Promise<Attendance[]> {
    return this.db
      .select()
      .from(attendances)
      .where(
        and(
          eq(attendances.school_id, schoolId),
          eq(attendances.class_section_id, classSectionId),
          eq(attendances.date, date),
        ),
      );
  }

  async getSectionByDateRange(schoolId: string, classSectionId: string, from_date: string, to_date: string): Promise<Attendance[]> {
    return this.db
      .select()
      .from(attendances)
      .where(
        and(
          eq(attendances.school_id, schoolId),
          eq(attendances.class_section_id, classSectionId),
          gte(attendances.date, from_date),
          lte(attendances.date, to_date),
        ),
      )
      .orderBy(attendances.date);
  }

  async getDefaulters(schoolId: string, class_section_id?: string, academic_year_id?: string, threshold = 75) {
    const conditions = [eq(attendances.school_id, schoolId)];
    if (class_section_id) conditions.push(eq(attendances.class_section_id, class_section_id));
    if (academic_year_id) conditions.push(eq(attendances.academic_year_id, academic_year_id));

    const results = await this.db
      .select({
        student_id: attendances.student_id,
        total: sql<number>`count(*)`,
        present: sql<number>`sum(case when ${attendances.status} = 'PRESENT' then 1 else 0 end)`,
      })
      .from(attendances)
      .where(and(...conditions))
      .groupBy(attendances.student_id);

    return results.filter((r) => {
      const pct = Number(r.total) > 0 ? (Number(r.present) / Number(r.total)) * 100 : 0;
      return pct < threshold;
    });
  }
}
