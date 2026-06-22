import { Injectable, Inject } from '@nestjs/common';
import { eq, and, SQL } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../../database/drizzle/drizzle.provider';
import { students, studentAcademicInfo } from '../../../database/drizzle/schema/students.schema';
import { exams } from '@database/drizzle/schema/exam.schema';
import { examSchedules } from '@database/drizzle/schema/exam-schedule.schema';

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
        admissionNumber: studentAcademicInfo.admission_number,
        rollNumber: studentAcademicInfo.roll_number,
      })
      .from(studentAcademicInfo)
      .innerJoin(students, eq(studentAcademicInfo.student_id, students.id))
      .where(and(...conditions))
      .orderBy(studentAcademicInfo.roll_number);
  }
}
