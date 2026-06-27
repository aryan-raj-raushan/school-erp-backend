import { Injectable, Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../../database/drizzle/drizzle.provider';
import { students, studentAcademicInfo } from '../../../database/drizzle/schema/students.schema';
import { schools } from '../../../database/drizzle/schema/schools.schema';
import { classes } from '../../../database/drizzle/schema/classes.schema';
import { sections } from '../../../database/drizzle/schema/sections.schema';
import { exams } from '@database/drizzle/schema/exam.schema';
import { examSchedules } from '@database/drizzle/schema/exam-schedule.schema';

@Injectable()
export class ExamAdmitCardRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  async findExamByIdAndSchool(examId: string, schoolId: string) {
    const [exam] = await this.db
      .select()
      .from(exams)
      .where(and(eq(exams.id, examId), eq(exams.school_id, schoolId), eq(exams.deleted, false)));
    return exam ?? null;
  }

  async findStudentAcademicInfo(studentId: string, academicYearId: string, schoolId: string) {
    const [info] = await this.db
      .select({
        studentId: students.id,
        firstName: students.first_name,
        lastName: students.last_name,
        profileImage: students.profile_image,
        admissionNumber: studentAcademicInfo.admission_number,
        rollNumber: studentAcademicInfo.roll_number,
        classId: studentAcademicInfo.class_id,
        sectionId: studentAcademicInfo.section_id,
        className: classes.name,
        sectionName: sections.name,
      })
      .from(studentAcademicInfo)
      .innerJoin(students, eq(studentAcademicInfo.student_id, students.id))
      .leftJoin(classes, eq(studentAcademicInfo.class_id, classes.id))
      .leftJoin(sections, eq(studentAcademicInfo.section_id, sections.id))
      .where(
        and(
          eq(studentAcademicInfo.student_id, studentId),
          eq(studentAcademicInfo.academic_year_id, academicYearId),
          eq(studentAcademicInfo.school_id, schoolId),
          eq(studentAcademicInfo.deleted, false),
        ),
      );
    return info ?? null;
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
          eq(examSchedules.is_enabled, true),
        ),
      )
      .orderBy(examSchedules.exam_date, examSchedules.start_time);
  }

  async findSchoolById(schoolId: string) {
    const [school] = await this.db
      .select({ id: schools.id, name: schools.name })
      .from(schools)
      .where(eq(schools.id, schoolId));
    return school ?? null;
  }
}
