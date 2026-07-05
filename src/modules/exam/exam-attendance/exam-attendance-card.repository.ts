import { Injectable, Inject } from '@nestjs/common';
import { eq, and, desc, SQL } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../../database/drizzle/drizzle.provider';
import {
  students,
  studentAcademicInfo,
  studentParents,
} from '../../../database/drizzle/schema/students.schema';
import { exams } from '@database/drizzle/schema/exam.schema';
import { examSchedules } from '@database/drizzle/schema/exam-schedule.schema';
import { classes } from '@database/drizzle/schema/classes.schema';
import { sections } from '@database/drizzle/schema/sections.schema';
import { academicYears } from '@database/drizzle/schema/academic-years.schema';
import { schools } from '@database/drizzle/schema/schools.schema';

@Injectable()
export class ExamAttendanceCardRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  async findExamByIdAndSchool(examId: string, schoolId: string) {
    const [exam] = await this.db
      .select()
      .from(exams)
      .where(and(eq(exams.id, examId), eq(exams.school_id, schoolId), eq(exams.deleted, false)));
    return exam ?? null;
  }

  async findExamSchedulesByClassAndExam(examId: string, classId: string, schoolId: string) {
    return this.db
      .select()
      .from(examSchedules)
      .where(
        and(
          eq(examSchedules.exam_id, examId),
          eq(examSchedules.class_id, classId),
          eq(examSchedules.school_id, schoolId),
          eq(examSchedules.deleted, false),
        ),
      )
      .orderBy(examSchedules.exam_date, examSchedules.start_time);
  }

  async findClassById(classId: string, schoolId: string) {
    const [row] = await this.db
      .select({ id: classes.id, name: classes.name })
      .from(classes)
      .where(and(eq(classes.id, classId), eq(classes.school_id, schoolId)));
    return row ?? null;
  }

  async findSectionById(sectionId: string, schoolId: string) {
    const [row] = await this.db
      .select({ id: sections.id, name: sections.name })
      .from(sections)
      .where(and(eq(sections.id, sectionId), eq(sections.school_id, schoolId)));
    return row ?? null;
  }

  async findAcademicYearById(academicYearId: string, schoolId: string) {
    const [row] = await this.db
      .select({ id: academicYears.id, name: academicYears.name })
      .from(academicYears)
      .where(and(eq(academicYears.id, academicYearId), eq(academicYears.school_id, schoolId)));
    return row ?? null;
  }

  async findSchoolProfile(schoolId: string) {
    const [row] = await this.db
      .select({
        name: schools.name,
        address: schools.address,
        city: schools.city,
        state: schools.state,
        contactNumber: schools.contact_number,
        dialCode: schools.dial_code,
        logoUrl: schools.logo_url,
      })
      .from(schools)
      .where(eq(schools.id, schoolId));
    return row ?? null;
  }

  /** Each student's primary parent/guardian (falls back to the most recently added one if none is flagged primary). */
  async findPrimaryParentsByStudentIds(
    studentIds: string[],
    schoolId: string,
  ): Promise<Map<string, { firstName: string; lastName: string | null }>> {
    if (studentIds.length === 0) return new Map();
    const rows = await this.db
      .select({
        studentId: studentParents.student_id,
        firstName: studentParents.first_name,
        lastName: studentParents.last_name,
        isPrimary: studentParents.is_primary,
      })
      .from(studentParents)
      .where(and(eq(studentParents.school_id, schoolId), eq(studentParents.deleted, false)))
      .orderBy(desc(studentParents.is_primary), desc(studentParents.created_at));

    const byStudent = new Map<string, { firstName: string; lastName: string | null }>();
    for (const row of rows) {
      if (!studentIds.includes(row.studentId)) continue;
      if (byStudent.has(row.studentId)) continue; // first row per student (primary-first ordering) wins
      byStudent.set(row.studentId, { firstName: row.firstName, lastName: row.lastName });
    }
    return byStudent;
  }

  async findStudentsByClass(
    classId: string,
    academicYearId: string,
    schoolId: string,
    sectionId?: string,
  ) {
    const conditions: SQL[] = [
      eq(studentAcademicInfo.academic_year_id, academicYearId),
      eq(studentAcademicInfo.class_id, classId),
      eq(studentAcademicInfo.school_id, schoolId),
      eq(studentAcademicInfo.deleted, false),
    ];

    if (sectionId) {
      conditions.push(eq(studentAcademicInfo.section_id, sectionId));
    }

    return this.db
      .select({
        studentId: students.id,
        firstName: students.first_name,
        lastName: students.last_name,
        profileImage: students.profile_image,
        admissionNumber: studentAcademicInfo.admission_number,
        rollNumber: studentAcademicInfo.roll_number,
      })
      .from(studentAcademicInfo)
      .innerJoin(students, eq(studentAcademicInfo.student_id, students.id))
      .where(and(...conditions))
      .orderBy(studentAcademicInfo.roll_number);
  }
}
