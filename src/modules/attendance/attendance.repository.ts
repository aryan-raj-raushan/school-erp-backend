import { Injectable, Inject } from '@nestjs/common';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { attendances } from '../../database/drizzle/schema/attendance.schema';
import { students } from '../../database/drizzle/schema/students.schema';
import { schoolUsers } from '../../database/drizzle/schema/school-users.schema';
import { sections } from '../../database/drizzle/schema/sections.schema';
import { classes } from '../../database/drizzle/schema/classes.schema';
import {
  Attendance,
  NewAttendance,
  EnrichedAttendanceRecord,
  DefaulterRecord,
  MonthlyBreakdown,
} from './types/attendance.types';
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
      .where(and(eq(attendances.student_id, studentId), eq(attendances.date, date), eq(attendances.school_id, schoolId)));
    return row;
  }

  async upsert(data: NewAttendance): Promise<Attendance> {
    const [row] = await this.db
      .insert(attendances)
      .values(data)
      .onConflictDoUpdate({
        target: [attendances.student_id, attendances.date],
        set: { status: data.status, remarks: data.remarks, is_late: data.is_late, updated_at: new Date() },
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
    await this.db.delete(attendances).where(and(eq(attendances.id, id), eq(attendances.school_id, schoolId)));
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

  async getStudentStats(studentId: string, schoolId: string, academicYearId?: string) {
    const conditions = [eq(attendances.student_id, studentId), eq(attendances.school_id, schoolId)];
    if (academicYearId) conditions.push(eq(attendances.academic_year_id, academicYearId));

    const [row] = await this.db
      .select({
        total: sql<number>`count(*)`,
        present: sql<number>`sum(case when ${attendances.status} = 'PRESENT' then 1 else 0 end)`,
        absent: sql<number>`sum(case when ${attendances.status} = 'ABSENT' then 1 else 0 end)`,
      })
      .from(attendances)
      .where(and(...conditions));

    const total = Number(row?.total ?? 0);
    const present = Number(row?.present ?? 0);
    const absent = Number(row?.absent ?? 0);
    return { total_days: total, present, absent, attendance_percentage: total > 0 ? Math.round((present / total) * 100 * 100) / 100 : 0 };
  }

  async getStudentMonthlySummary(studentId: string, schoolId: string, academicYearId?: string): Promise<MonthlyBreakdown[]> {
    const conditions = [eq(attendances.student_id, studentId), eq(attendances.school_id, schoolId)];
    if (academicYearId) conditions.push(eq(attendances.academic_year_id, academicYearId));

    const rows = await this.db
      .select({
        year: sql<number>`extract(year from ${attendances.date}::date)`,
        month: sql<number>`extract(month from ${attendances.date}::date)`,
        present: sql<number>`sum(case when ${attendances.status} = 'PRESENT' then 1 else 0 end)`,
        absent: sql<number>`sum(case when ${attendances.status} = 'ABSENT' then 1 else 0 end)`,
        total: sql<number>`count(*)`,
      })
      .from(attendances)
      .where(and(...conditions))
      .groupBy(sql`extract(year from ${attendances.date}::date)`, sql`extract(month from ${attendances.date}::date)`)
      .orderBy(sql`extract(year from ${attendances.date}::date)`, sql`extract(month from ${attendances.date}::date)`);

    return rows.map((r) => {
      const total = Number(r.total);
      const present = Number(r.present);
      return {
        year: Number(r.year),
        month: Number(r.month),
        present,
        absent: Number(r.absent),
        total,
        percent: total > 0 ? Math.round((present / total) * 100 * 100) / 100 : 0,
      };
    });
  }

  async getDailyReportEnriched(schoolId: string, classSectionId: string, date: string): Promise<EnrichedAttendanceRecord[]> {
    return this.db
      .select({
        id: attendances.id,
        school_id: attendances.school_id,
        student_id: attendances.student_id,
        academic_year_id: attendances.academic_year_id,
        class_section_id: attendances.class_section_id,
        date: attendances.date,
        status: attendances.status,
        is_late: attendances.is_late,
        remarks: attendances.remarks,
        marked_by: attendances.marked_by,
        created_at: attendances.created_at,
        updated_at: attendances.updated_at,
        student_name: sql<string>`concat(${students.first_name}, ' ', ${students.last_name})`,
        // roll_number: students.roll_number,
        // admission_number: students.admission_number,
        marked_by_username: sql<string | null>`CASE WHEN ${schoolUsers.id} IS NOT NULL THEN concat(${schoolUsers.first_name}, ' ', ${schoolUsers.last_name}) ELSE NULL END`,
      })
      .from(attendances)
      .innerJoin(students, eq(attendances.student_id, students.id))
      .leftJoin(schoolUsers, eq(attendances.marked_by, schoolUsers.id))
      .where(
        and(
          eq(attendances.school_id, schoolId),
          eq(attendances.class_section_id, classSectionId),
          eq(attendances.date, date),
        ),
      );
  }

  async getMonthlyReportEnriched(schoolId: string, classSectionId: string, from_date: string, to_date: string): Promise<EnrichedAttendanceRecord[]> {
    return this.db
      .select({
        id: attendances.id,
        school_id: attendances.school_id,
        student_id: attendances.student_id,
        academic_year_id: attendances.academic_year_id,
        class_section_id: attendances.class_section_id,
        date: attendances.date,
        status: attendances.status,
        is_late: attendances.is_late,
        remarks: attendances.remarks,
        marked_by: attendances.marked_by,
        created_at: attendances.created_at,
        updated_at: attendances.updated_at,
        student_name: sql<string>`concat(${students.first_name}, ' ', ${students.last_name})`,
        // roll_number: students.roll_number,
        // admission_number: students.admission_number,
        marked_by_username: sql<string | null>`CASE WHEN ${schoolUsers.id} IS NOT NULL THEN concat(${schoolUsers.first_name}, ' ', ${schoolUsers.last_name}) ELSE NULL END`,
      })
      .from(attendances)
      .innerJoin(students, eq(attendances.student_id, students.id))
      .leftJoin(schoolUsers, eq(attendances.marked_by, schoolUsers.id))
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

  async getClassSectionName(classSectionId: string): Promise<string> {
    const [row] = await this.db
      .select({ class_name: classes.name, section_name: sections.name })
      .from(sections)
      .innerJoin(classes, eq(sections.class_id, classes.id))
      .where(eq(sections.id, classSectionId));
    return row ? `${row.class_name} ${row.section_name}` : classSectionId;
  }

  async getDefaulters(schoolId: string, class_section_id?: string, academic_year_id?: string, threshold = 75): Promise<DefaulterRecord[]> {
    const conditions = [eq(attendances.school_id, schoolId)];
    if (class_section_id) conditions.push(eq(attendances.class_section_id, class_section_id));
    if (academic_year_id) conditions.push(eq(attendances.academic_year_id, academic_year_id));

    const results = await this.db
      .select({
        student_id: attendances.student_id,
        student_name: sql<string>`concat(${students.first_name}, ' ', ${students.last_name})`,
        // roll_number: students.roll_number,
        // admission_number: students.admission_number,
        total: sql<number>`count(*)`,
        present: sql<number>`sum(case when ${attendances.status} = 'PRESENT' then 1 else 0 end)`,
        absent: sql<number>`sum(case when ${attendances.status} = 'ABSENT' then 1 else 0 end)`,
      })
      .from(attendances)
      .innerJoin(students, eq(attendances.student_id, students.id))
      .where(and(...conditions))
      // .groupBy(attendances.student_id, students.first_name, students.last_name, students.roll_number, students.admission_number);

    return results
      .filter((r) => {
        const total = Number(r.total);
        const present = Number(r.present);
        const pct = total > 0 ? (present / total) * 100 : 0;
        return pct < threshold;
      })
      .map((r) => {
        const total = Number(r.total);
        const present = Number(r.present);
        return {
          student_id: r.student_id,
          studentName: r.student_name,
          // rollNo: r.roll_number,
          // admissionNo: r.admission_number,
          total_days: total,
          total_present: present,
          total_absent: Number(r.absent),
          percentage: total > 0 ? Math.round((present / total) * 100 * 100) / 100 : 0,
        };
      });
  }

  // Legacy — kept for backward compat with section date-range endpoint
  async getDailyReport(schoolId: string, classSectionId: string, date: string): Promise<Attendance[]> {
    return this.db
      .select()
      .from(attendances)
      .where(and(eq(attendances.school_id, schoolId), eq(attendances.class_section_id, classSectionId), eq(attendances.date, date)));
  }

  async getSectionByDateRange(schoolId: string, classSectionId: string, from_date: string, to_date: string): Promise<Attendance[]> {
    return this.db
      .select()
      .from(attendances)
      .where(and(eq(attendances.school_id, schoolId), eq(attendances.class_section_id, classSectionId), gte(attendances.date, from_date), lte(attendances.date, to_date)))
      .orderBy(attendances.date);
  }
}
