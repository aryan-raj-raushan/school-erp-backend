import { Injectable, Inject } from '@nestjs/common';
import { eq, and, gte, lte, sql, isNull, count, desc } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { attendances } from '../../database/drizzle/schema/attendance.schema';
import { students } from '../../database/drizzle/schema/students.schema';
import { schoolUsers } from '../../database/drizzle/schema/school-users.schema';
import { sections } from '../../database/drizzle/schema/sections.schema';
import { classes } from '../../database/drizzle/schema/classes.schema';
import { rfidPunchLog } from '../../database/drizzle/schema/rfid-punch-log.schema';
import { studentAcademicInfo } from '../../database/drizzle/schema/students.schema';
import { attendanceConflicts } from '../../database/drizzle/schema/attendance-conflicts.schema';
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
        target: [attendances.student_id, attendances.date, attendances.session],
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
        session: attendances.session,
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
        session: attendances.session,
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

  async getDefaulters(schoolId: string, class_section_id?: string, month?: number, year?: number, threshold = 75): Promise<DefaulterRecord[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conditions: any[] = [eq(attendances.school_id, schoolId)];

    if (class_section_id) {
      conditions.push(eq(attendances.class_section_id, class_section_id));
    }

    if (month && year) {
      const firstDay = new Date(year, month - 1, 1).toISOString().split('T')[0];
      const lastDay = new Date(year, month, 0).toISOString().split('T')[0];
      conditions.push(gte(attendances.date, firstDay));
      conditions.push(lte(attendances.date, lastDay));
    }

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
      .groupBy(attendances.student_id, students.first_name, students.last_name);

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

  // Legacy â€” kept for backward compat with section date-range endpoint
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

  async getMissingPunches(schoolId: string, date: string) {
    return this.db
      .select({
        punch_id: rfidPunchLog.id,
        student_id: rfidPunchLog.student_id,
        student_name: sql<string>`${students.first_name} || ' ' || coalesce(${students.last_name}, '')`,
        admission_number: studentAcademicInfo.admission_number,
        entry_tap: rfidPunchLog.entry_tap,
        date: rfidPunchLog.date,
      })
      .from(rfidPunchLog)
      .innerJoin(students, eq(students.id, rfidPunchLog.student_id))
      .leftJoin(
        studentAcademicInfo,
        and(
          eq(studentAcademicInfo.student_id, rfidPunchLog.student_id),
          eq(studentAcademicInfo.is_current, true),
        ),
      )
      .where(
        and(
          eq(rfidPunchLog.school_id, schoolId),
          eq(rfidPunchLog.date, date),
          isNull(rfidPunchLog.exit_tap),
        ),
      )
      .orderBy(rfidPunchLog.entry_tap);
  }

  async getTodayStats(schoolId: string, today: string) {
    const rows = await this.db
      .select({ status: attendances.status, cnt: count() })
      .from(attendances)
      .where(and(eq(attendances.school_id, schoolId), eq(attendances.date, today)))
      .groupBy(attendances.status);

    const stats: Record<string, number> = {};
    for (const r of rows) stats[r.status] = Number(r.cnt);

    return {
      date: today,
      present: stats['PRESENT'] ?? 0,
      absent: stats['ABSENT'] ?? 0,
      late: stats['LATE'] ?? 0,
      half_day: stats['HALF_DAY'] ?? 0,
      leave: stats['LEAVE'] ?? 0,
      holiday: stats['HOLIDAY'] ?? 0,
      missing_punch: stats['MISSING_PUNCH'] ?? 0,
      total: Object.values(stats).reduce((a, b) => a + b, 0),
    };
  }

  async getStudentHeatmap(schoolId: string, studentId: string, year: number) {
    const from = `${year}-01-01`;
    const to = `${year}-12-31`;
    return this.db
      .select({ date: attendances.date, status: attendances.status })
      .from(attendances)
      .where(
        and(
          eq(attendances.school_id, schoolId),
          eq(attendances.student_id, studentId),
          gte(attendances.date, from),
          lte(attendances.date, to),
        ),
      )
      .orderBy(attendances.date);
  }

  async getLateTrend(schoolId: string, classSectionId: string, month: number, year: number) {
    const pad = (n: number) => String(n).padStart(2, '0');
    const from = `${year}-${pad(month)}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to = `${year}-${pad(month)}-${lastDay}`;
    return this.db
      .select({
        date: attendances.date,
        late_count: count(),
      })
      .from(attendances)
      .where(
        and(
          eq(attendances.school_id, schoolId),
          eq(attendances.class_section_id, classSectionId),
          eq(attendances.is_late, true),
          gte(attendances.date, from),
          lte(attendances.date, to),
        ),
      )
      .groupBy(attendances.date)
      .orderBy(attendances.date);
  }

  async getConflicts(schoolId: string, date?: string) {
    const conditions = [eq(attendanceConflicts.school_id, schoolId), isNull(attendanceConflicts.resolved_at)];
    if (date) conditions.push(eq(attendanceConflicts.date, date) as any);
    return this.db
      .select()
      .from(attendanceConflicts)
      .where(and(...conditions))
      .orderBy(desc(attendanceConflicts.created_at));
  }

  async resolveConflict(conflictId: string, schoolId: string, resolution: 'RFID_WON' | 'MANUAL_WON' | 'ADMIN_SET', resolvedBy: string) {
    const [row] = await this.db
      .update(attendanceConflicts)
      .set({ resolution, resolved_by: resolvedBy, resolved_at: new Date() })
      .where(and(eq(attendanceConflicts.id, conflictId), eq(attendanceConflicts.school_id, schoolId)))
      .returning();
    return row;
  }

  async getExportRecords(
    schoolId: string,
    filters: { class_section_id?: string; start_date?: string; end_date?: string; academic_year_id?: string },
  ) {
    const conditions = [eq(attendances.school_id, schoolId)];
    if (filters.class_section_id) conditions.push(eq(attendances.class_section_id, filters.class_section_id));
    if (filters.academic_year_id) conditions.push(eq(attendances.academic_year_id, filters.academic_year_id));
    if (filters.start_date) conditions.push(gte(attendances.date, filters.start_date));
    if (filters.end_date) conditions.push(lte(attendances.date, filters.end_date));

    return this.db
      .select({
        date: attendances.date,
        status: attendances.status,
        is_late: attendances.is_late,
        session: attendances.session,
        remarks: attendances.remarks,
        student_name: sql<string>`concat(${students.first_name}, ' ', coalesce(${students.last_name}, ''))`,
        marked_by_name: sql<string | null>`CASE WHEN ${schoolUsers.id} IS NOT NULL THEN concat(${schoolUsers.first_name}, ' ', ${schoolUsers.last_name}) ELSE NULL END`,
        section_label: sql<string>`concat(${classes.name}, ' ', ${sections.name})`,
      })
      .from(attendances)
      .innerJoin(students, eq(attendances.student_id, students.id))
      .leftJoin(schoolUsers, eq(attendances.marked_by, schoolUsers.id))
      .leftJoin(sections, eq(attendances.class_section_id, sections.id))
      .leftJoin(classes, eq(sections.class_id, classes.id))
      .where(and(...conditions))
      .orderBy(attendances.date, students.first_name);
  }

  async resolveMissingPunch(punchId: string, schoolId: string, resolvedStatus: 'PRESENT' | 'HALF_DAY'): Promise<void> {
    const [punch] = await this.db
      .select()
      .from(rfidPunchLog)
      .where(and(eq(rfidPunchLog.id, punchId), eq(rfidPunchLog.school_id, schoolId)))
      .limit(1);

    if (!punch) return;

    await this.db
      .update(rfidPunchLog)
      .set({ status: 'COMPLETE' })
      .where(eq(rfidPunchLog.id, punchId));

    await this.db
      .update(attendances)
      .set({ status: resolvedStatus })
      .where(
        and(
          eq(attendances.student_id, punch.student_id),
          eq(attendances.school_id, schoolId),
          eq(attendances.date, punch.date),
        ),
      );
  }
}
