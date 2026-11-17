import { Injectable, Inject } from '@nestjs/common';
import { desc, eq, and, or, ilike, sql, SQL } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import {
  rfidScanEvents,
  NewRfidScanEventRow,
  RfidScanEventRow,
} from '../../database/drizzle/schema/rfid-scan-events.schema';
import { schoolUsers } from '../../database/drizzle/schema/school-users.schema';
import { rfidDevices } from '../../database/drizzle/schema/rfid-devices.schema';
import { students, studentAcademicInfo } from '../../database/drizzle/schema/students.schema';
import { academicYears } from '../../database/drizzle/schema/academic-years.schema';
import { classes } from '../../database/drizzle/schema/classes.schema';
import { schools } from '../../database/drizzle/schema/schools.schema';
import { DateUtils } from '../../utils/date.utils';
import { sections } from '../../database/drizzle/schema/sections.schema';
import { attendances } from '../../database/drizzle/schema/attendance.schema';
import { staffAttendances } from '../../database/drizzle/schema/staff-attendance.schema';
import { examSchedules } from '../../database/drizzle/schema/exam-schedule.schema';
import { examAttendance } from '../../database/drizzle/schema/exam-attendance.schema';
import { AttendanceEngineService } from '../attendance/attendance-engine.service';
import { rfidPunchLog } from '../../database/drizzle/schema/rfid-punch-log.schema';
import { studentMovements } from '../../database/drizzle/schema/student-movements.schema';

export type CardOwner = { id: string; school_id: string; type: 'staff' | 'student' };

export type DeviceMapping = {
  id: string;
  status: string;
  assigned_school_id: string | null;
};

export type PersonRow = {
  id: string;
  name: string;
  type: 'staff' | 'student';
  rfidCardNumber: string | null;
};

@Injectable()
export class RfidRepository {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: DrizzleDB,
    private readonly engine: AttendanceEngineService,
  ) {}

  async insert(data: NewRfidScanEventRow): Promise<void> {
    await this.db.insert(rfidScanEvents).values(data).onConflictDoNothing();
  }

  async findRecentBySchool(schoolId: string, limit: number): Promise<RfidScanEventRow[]> {
    return this.db
      .select()
      .from(rfidScanEvents)
      .where(eq(rfidScanEvents.school_id, schoolId))
      .orderBy(desc(rfidScanEvents.received_at))
      .limit(limit);
  }

  async findDeviceByIdentifier(deviceIdentifier: string): Promise<DeviceMapping | null> {
    const [row] = await this.db
      .select({
        id: rfidDevices.id,
        status: rfidDevices.status,
        assigned_school_id: rfidDevices.assigned_school_id,
      })
      .from(rfidDevices)
      .where(sql`upper(${rfidDevices.device_identifier}) = upper(${deviceIdentifier})`)
      .orderBy(sql`${rfidDevices.assigned_school_id} is null`)
      .limit(1);
    return row ?? null;
  }

  async touchDevice(id: string, seenAt: Date): Promise<void> {
    await this.db.update(rfidDevices).set({ last_seen_at: seenAt }).where(eq(rfidDevices.id, id));
  }

  async getAllPersonsWithRfid(
    schoolId: string,
  ): Promise<{ rfid: string; name: string; type: 'staff' | 'student'; id: string }[]> {
    const staffRows = await this.db
      .select({
        id: schoolUsers.id,
        first_name: schoolUsers.first_name,
        last_name: schoolUsers.last_name,
        rfid: schoolUsers.rfid_card_number,
      })
      .from(schoolUsers)
      .where(and(eq(schoolUsers.school_id, schoolId), eq(schoolUsers.deleted, false)));

    const studentRows = await this.db
      .select({
        id: students.id,
        first_name: students.first_name,
        last_name: students.last_name,
        rfid: students.id_card_number,
      })
      .from(students)
      .where(and(eq(students.school_id, schoolId), eq(students.deleted, false)));

    const result: { rfid: string; name: string; type: 'staff' | 'student'; id: string }[] = [];
    for (const r of staffRows) {
      if (r.rfid)
        result.push({
          rfid: r.rfid,
          name: `${r.first_name} ${r.last_name ?? ''}`.trim(),
          type: 'staff',
          id: r.id,
        });
    }
    for (const r of studentRows) {
      if (r.rfid)
        result.push({
          rfid: r.rfid,
          name: `${r.first_name} ${r.last_name ?? ''}`.trim(),
          type: 'student',
          id: r.id,
        });
    }
    return result;
  }

  async searchPersons(
    q: string,
    type: 'staff' | 'student' | 'all',
    schoolId: string,
  ): Promise<PersonRow[]> {
    const term = `%${q}%`;
    const result: PersonRow[] = [];

    if (type === 'staff' || type === 'all') {
      const rows = await this.db
        .select({
          id: schoolUsers.id,
          first_name: schoolUsers.first_name,
          last_name: schoolUsers.last_name,
          rfid: schoolUsers.rfid_card_number,
        })
        .from(schoolUsers)
        .where(
          and(
            eq(schoolUsers.school_id, schoolId),
            eq(schoolUsers.deleted, false),
            or(ilike(schoolUsers.first_name, term), ilike(schoolUsers.last_name, term)),
          ),
        )
        .limit(10);
      result.push(
        ...rows.map((r) => ({
          id: r.id,
          name: `${r.first_name} ${r.last_name ?? ''}`.trim(),
          type: 'staff' as const,
          rfidCardNumber: r.rfid ?? null,
        })),
      );
    }

    if (type === 'student' || type === 'all') {
      const rows = await this.db
        .select({
          id: students.id,
          first_name: students.first_name,
          last_name: students.last_name,
          rfid: students.id_card_number,
        })
        .from(students)
        .where(
          and(
            eq(students.school_id, schoolId),
            eq(students.deleted, false),
            or(ilike(students.first_name, term), ilike(students.last_name, term)),
          ),
        )
        .limit(10);
      result.push(
        ...rows.map((r) => ({
          id: r.id,
          name: `${r.first_name} ${r.last_name ?? ''}`.trim(),
          type: 'student' as const,
          rfidCardNumber: r.rfid ?? null,
        })),
      );
    }

    return result;
  }

  async assignToStaff(rfidCardId: string, staffId: string, schoolId: string): Promise<void> {
    await this.db
      .update(schoolUsers)
      .set({ rfid_card_number: rfidCardId })
      .where(and(eq(schoolUsers.id, staffId), eq(schoolUsers.school_id, schoolId)));
  }

  async assignToStudent(rfidCardId: string, studentId: string, schoolId: string): Promise<void> {
    await this.db
      .update(students)
      .set({ id_card_number: rfidCardId })
      .where(and(eq(students.id, studentId), eq(students.school_id, schoolId)));
  }

  async unassignFromStaff(staffId: string, schoolId: string): Promise<void> {
    await this.db
      .update(schoolUsers)
      .set({ rfid_card_number: null })
      .where(and(eq(schoolUsers.id, staffId), eq(schoolUsers.school_id, schoolId)));
  }

  async unassignFromStudent(studentId: string, schoolId: string): Promise<void> {
    await this.db
      .update(students)
      .set({ id_card_number: null })
      .where(and(eq(students.id, studentId), eq(students.school_id, schoolId)));
  }

  async autoMarkStudentAttendance(
    studentId: string,
    schoolId: string,
    tapDate: Date,
  ): Promise<void> {
    const [currentYear] = await this.db
      .select({ id: academicYears.id })
      .from(academicYears)
      .where(and(eq(academicYears.school_id, schoolId), eq(academicYears.is_current, true)))
      .limit(1);

    if (!currentYear) return;

    const [academic] = await this.db
      .select({
        section_id: studentAcademicInfo.section_id,
        class_id: studentAcademicInfo.class_id,
      })
      .from(studentAcademicInfo)
      .where(
        and(
          eq(studentAcademicInfo.student_id, studentId),
          eq(studentAcademicInfo.academic_year_id, currentYear.id),
        ),
      )
      .limit(1);

    if (!academic) return;
    const classSectionId = academic.section_id ?? academic.class_id;

    const { date: dateStr, time: tapTime } = DateUtils.zonedDateTime(
      tapDate,
      await this.findSchoolTimezone(schoolId),
    );

    // Check if an entry punch already exists for today
    const [existingPunch] = await this.db
      .select()
      .from(rfidPunchLog)
      .where(
        and(
          eq(rfidPunchLog.student_id, studentId),
          eq(rfidPunchLog.school_id, schoolId),
          eq(rfidPunchLog.date, dateStr),
        ),
      )
      .limit(1);

    if (existingPunch) {
      // Second tap = exit tap — mark punch as COMPLETE
      if (!existingPunch.exit_tap) {
        await this.db
          .update(rfidPunchLog)
          .set({ exit_tap: tapDate, status: 'COMPLETE' })
          .where(eq(rfidPunchLog.id, existingPunch.id));
      }
      // Attendance was already marked on entry; nothing more to do
      return;
    }

    // First tap of the day — write punch log entry
    await this.db.insert(rfidPunchLog).values({
      id: randomUUID(),
      school_id: schoolId,
      student_id: studentId,
      date: dateStr,
      entry_tap: tapDate,
      status: 'MISSING_EXIT',
    });

    const engineResult = await this.engine.resolve({
      schoolId,
      personId: studentId,
      personType: 'STUDENT',
      date: dateStr,
      tapTime,
      source: 'RFID',
      classSectionId,
    });

    if (engineResult.status === 'HOLIDAY' || engineResult.status === 'SKIP') return;

    await this.db
      .insert(attendances)
      .values({
        id: randomUUID(),
        school_id: schoolId,
        student_id: studentId,
        academic_year_id: currentYear.id,
        class_section_id: classSectionId,
        date: dateStr,
        session: 'MORNING' as const,
        status: engineResult.status as typeof attendances.$inferInsert.status,
        marked_by: 'rfid-auto',
        mode: 'RFID',
        marked_at: tapDate,
        is_late: engineResult.isLate,
      })
      .onConflictDoNothing();

    // Log campus entry in student_movements
    await this.db
      .insert(studentMovements)
      .values({
        id: randomUUID(),
        school_id: schoolId,
        student_id: studentId,
        date: dateStr,
        tapped_at: tapDate,
        location: 'CAMPUS',
        device_id: null,
      })
      .onConflictDoNothing();
  }

  async findCardOwners(rfidCardId: string, schoolId?: string): Promise<CardOwner[]> {
    const studentConditions: SQL[] = [
      eq(students.id_card_number, rfidCardId),
      eq(students.deleted, false),
    ];
    const staffConditions: SQL[] = [
      eq(schoolUsers.rfid_card_number, rfidCardId),
      eq(schoolUsers.deleted, false),
    ];
    if (schoolId) {
      studentConditions.push(eq(students.school_id, schoolId));
      staffConditions.push(eq(schoolUsers.school_id, schoolId));
    }

    const [studentRows, staffRows] = await Promise.all([
      this.db
        .select({ id: students.id, school_id: students.school_id })
        .from(students)
        .where(and(...studentConditions))
        .limit(2),
      this.db
        .select({ id: schoolUsers.id, school_id: schoolUsers.school_id })
        .from(schoolUsers)
        .where(and(...staffConditions))
        .limit(2),
    ]);

    return [
      ...studentRows.map((r) => ({ ...r, type: 'student' as const })),
      ...staffRows.map((r) => ({ ...r, type: 'staff' as const })),
    ];
  }

  async autoMarkStaffAttendance(staffId: string, schoolId: string, tapDate: Date): Promise<void> {
    const { date: dateStr, time: tapTime } = DateUtils.zonedDateTime(
      tapDate,
      await this.findSchoolTimezone(schoolId),
    );

    const engineResult = await this.engine.resolve({
      schoolId,
      personId: staffId,
      personType: 'STAFF',
      date: dateStr,
      tapTime,
      source: 'RFID',
    });

    if (engineResult.status === 'HOLIDAY' || engineResult.status === 'SKIP') return;

    await this.db
      .insert(staffAttendances)
      .values({
        id: randomUUID(),
        school_id: schoolId,
        staff_id: staffId,
        date: dateStr,
        status: engineResult.status as typeof staffAttendances.$inferInsert.status,
        marked_by: 'rfid-auto',
        mode: 'RFID',
        marked_at: tapDate,
        is_late: engineResult.isLate,
      })
      .onConflictDoNothing();
  }

  async autoMarkExamAttendance(studentId: string, schoolId: string, tapDate: Date): Promise<void> {
    const [year] = await this.db
      .select({ id: academicYears.id })
      .from(academicYears)
      .where(and(eq(academicYears.school_id, schoolId), eq(academicYears.is_current, true)))
      .limit(1);
    if (!year) return;

    const [info] = await this.db
      .select({ class_id: studentAcademicInfo.class_id })
      .from(studentAcademicInfo)
      .where(
        and(
          eq(studentAcademicInfo.student_id, studentId),
          eq(studentAcademicInfo.academic_year_id, year.id),
        ),
      )
      .limit(1);
    if (!info?.class_id) return;

    const dateStr = tapDate.toISOString().split('T')[0];

    const todaySchedules = await this.db
      .select({ id: examSchedules.id, exam_id: examSchedules.exam_id })
      .from(examSchedules)
      .where(
        and(
          eq(examSchedules.school_id, schoolId),
          eq(examSchedules.class_id, info.class_id),
          eq(examSchedules.exam_date, dateStr),
          eq(examSchedules.is_enabled, true),
          eq(examSchedules.deleted, false),
        ),
      );
    if (todaySchedules.length === 0) return;

    // onConflictDoNothing: RFID never overwrites a manually set ABSENT
    await this.db
      .insert(examAttendance)
      .values(
        todaySchedules.map((sc) => ({
          id: randomUUID(),
          school_id: schoolId,
          academic_year_id: year.id,
          exam_id: sc.exam_id,
          schedule_id: sc.id,
          student_id: studentId,
          status: 'PRESENT' as const,
          marked_by: 'rfid-auto',
        })),
      )
      .onConflictDoNothing();
  }

  async findSchoolTimezone(schoolId: string): Promise<string> {
    const [row] = await this.db
      .select({ timezone: schools.timezone })
      .from(schools)
      .where(eq(schools.id, schoolId))
      .limit(1);
    return row?.timezone || 'Asia/Kolkata';
  }

  async findCurrentAcademicYear(schoolId: string) {
    const [year] = await this.db
      .select({
        id: academicYears.id,
        name: academicYears.name,
        is_enabled: academicYears.is_enabled,
      })
      .from(academicYears)
      .where(and(eq(academicYears.school_id, schoolId), eq(academicYears.is_current, true)))
      .limit(1);
    return year;
  }

  private withoutCard(
    column: typeof students.id_card_number | typeof schoolUsers.rfid_card_number,
  ) {
    return sql`coalesce(trim(${column}), '') = ''`;
  }

  async countUnassignedStudentsBySection(schoolId: string, academicYearId: string) {
    return this.db
      .select({
        class_id: studentAcademicInfo.class_id,
        class_name: classes.name,
        section_id: studentAcademicInfo.section_id,
        section_name: sections.name,
        unassigned: sql<number>`count(*)::int`,
      })
      .from(studentAcademicInfo)
      .innerJoin(students, eq(students.id, studentAcademicInfo.student_id))
      .innerJoin(classes, eq(classes.id, studentAcademicInfo.class_id))
      .leftJoin(sections, eq(sections.id, studentAcademicInfo.section_id))
      .where(
        and(
          eq(studentAcademicInfo.school_id, schoolId),
          eq(studentAcademicInfo.academic_year_id, academicYearId),
          eq(studentAcademicInfo.deleted, false),
          eq(students.deleted, false),
          eq(students.is_enabled, true),
          this.withoutCard(students.id_card_number),
        ),
      )
      .groupBy(
        studentAcademicInfo.class_id,
        classes.name,
        classes.class_sequence,
        studentAcademicInfo.section_id,
        sections.name,
      )
      .orderBy(classes.class_sequence, classes.name, sections.name);
  }

  async findUnassignedStudents(
    schoolId: string,
    academicYearId: string,
    classId: string,
    sectionId?: string,
  ) {
    return this.db
      .select({
        id: students.id,
        first_name: students.first_name,
        last_name: students.last_name,
        roll_number: studentAcademicInfo.roll_number,
        admission_number: studentAcademicInfo.admission_number,
      })
      .from(studentAcademicInfo)
      .innerJoin(students, eq(students.id, studentAcademicInfo.student_id))
      .where(
        and(
          eq(studentAcademicInfo.school_id, schoolId),
          eq(studentAcademicInfo.academic_year_id, academicYearId),
          eq(studentAcademicInfo.class_id, classId),
          sectionId ? eq(studentAcademicInfo.section_id, sectionId) : undefined,
          eq(studentAcademicInfo.deleted, false),
          eq(students.deleted, false),
          eq(students.is_enabled, true),
          this.withoutCard(students.id_card_number),
        ),
      )
      .orderBy(students.first_name, students.last_name);
  }

  async findUnassignedStaff(schoolId: string) {
    return this.db
      .select({
        id: schoolUsers.id,
        salutation: schoolUsers.salutation,
        first_name: schoolUsers.first_name,
        last_name: schoolUsers.last_name,
        employee_code: schoolUsers.employee_code,
        role: schoolUsers.role,
      })
      .from(schoolUsers)
      .where(
        and(
          eq(schoolUsers.school_id, schoolId),
          eq(schoolUsers.deleted, false),
          eq(schoolUsers.is_active, true),
          this.withoutCard(schoolUsers.rfid_card_number),
        ),
      )
      .orderBy(schoolUsers.first_name, schoolUsers.last_name);
  }

  async isEnrolledInYear(studentId: string, schoolId: string, academicYearId: string) {
    const [row] = await this.db
      .select({ id: studentAcademicInfo.id })
      .from(studentAcademicInfo)
      .where(
        and(
          eq(studentAcademicInfo.student_id, studentId),
          eq(studentAcademicInfo.school_id, schoolId),
          eq(studentAcademicInfo.academic_year_id, academicYearId),
          eq(studentAcademicInfo.deleted, false),
        ),
      )
      .limit(1);
    return !!row;
  }
}
