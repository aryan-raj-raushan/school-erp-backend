import { Injectable, Inject } from '@nestjs/common';
import { desc, eq, and, or, ilike } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import {
  rfidScanEvents,
  NewRfidScanEventRow,
  RfidScanEventRow,
} from '../../database/drizzle/schema/rfid-scan-events.schema';
import { schoolUsers } from '../../database/drizzle/schema/school-users.schema';
import { students, studentAcademicInfo } from '../../database/drizzle/schema/students.schema';
import { academicYears } from '../../database/drizzle/schema/academic-years.schema';
import { attendances } from '../../database/drizzle/schema/attendance.schema';
import { staffAttendances } from '../../database/drizzle/schema/staff-attendance.schema';
import { examSchedules } from '../../database/drizzle/schema/exam-schedule.schema';
import { examAttendance } from '../../database/drizzle/schema/exam-attendance.schema';

export type PersonRow = {
  id: string;
  name: string;
  type: 'staff' | 'student';
  rfidCardNumber: string | null;
};

@Injectable()
export class RfidRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  async insert(data: NewRfidScanEventRow): Promise<void> {
    await this.db.insert(rfidScanEvents).values(data).onConflictDoNothing();
  }

  async findRecent(limit = 100): Promise<RfidScanEventRow[]> {
    return this.db
      .select()
      .from(rfidScanEvents)
      .orderBy(desc(rfidScanEvents.received_at))
      .limit(limit);
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
      .select({ section_id: studentAcademicInfo.section_id })
      .from(studentAcademicInfo)
      .where(
        and(
          eq(studentAcademicInfo.student_id, studentId),
          eq(studentAcademicInfo.academic_year_id, currentYear.id),
        ),
      )
      .limit(1);

    if (!academic?.section_id) return;

    const dateStr = tapDate.toISOString().split('T')[0];

    await this.db
      .insert(attendances)
      .values({
        id: randomUUID(),
        school_id: schoolId,
        student_id: studentId,
        academic_year_id: currentYear.id,
        class_section_id: academic.section_id,
        date: dateStr,
        status: 'PRESENT',
        marked_by: 'rfid-auto',
        is_late: false,
      })
      .onConflictDoNothing();
  }

  async findStudentByRfid(rfidCardId: string): Promise<{ id: string; school_id: string } | null> {
    const [row] = await this.db
      .select({ id: students.id, school_id: students.school_id })
      .from(students)
      .where(and(eq(students.id_card_number, rfidCardId), eq(students.deleted, false)))
      .limit(1);
    return row ?? null;
  }

  async findStaffByRfid(rfidCardId: string): Promise<{ id: string; school_id: string } | null> {
    const [row] = await this.db
      .select({ id: schoolUsers.id, school_id: schoolUsers.school_id })
      .from(schoolUsers)
      .where(and(eq(schoolUsers.rfid_card_number, rfidCardId), eq(schoolUsers.deleted, false)))
      .limit(1);
    return row ?? null;
  }

  async autoMarkStaffAttendance(staffId: string, schoolId: string, tapDate: Date): Promise<void> {
    const dateStr = tapDate.toISOString().split('T')[0];
    await this.db
      .insert(staffAttendances)
      .values({
        id: randomUUID(),
        school_id: schoolId,
        staff_id: staffId,
        date: dateStr,
        status: 'PRESENT',
        marked_by: 'rfid-auto',
        is_late: false,
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
}
