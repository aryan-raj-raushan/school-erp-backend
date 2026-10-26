import { Injectable, Inject } from '@nestjs/common';
import { and, asc, desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import {
  academicYears,
  classes,
  feeBillPayments,
  feeBills,
  feeTypes,
  schoolUsers,
  schools,
  sections,
  studentAcademicInfo,
  studentParents,
  students,
} from '../../database/drizzle/schema';

@Injectable()
export class BackupRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  async findSchool(schoolId: string) {
    const [row] = await this.db
      .select()
      .from(schools)
      .where(and(eq(schools.id, schoolId), eq(schools.deleted, false)));
    return row;
  }

  findClassesAndSections(schoolId: string) {
    const teacher = alias(schoolUsers, 'class_teacher');
    return this.db
      .select({
        academic_year: academicYears.name,
        class_name: classes.name,
        section_name: sections.name,
        room_number: sections.room_number,
        max_strength: sections.max_strength,
        teacher_first_name: teacher.first_name,
        teacher_last_name: teacher.last_name,
      })
      .from(classes)
      .innerJoin(academicYears, eq(academicYears.id, classes.academic_year_id))
      .leftJoin(sections, and(eq(sections.class_id, classes.id), eq(sections.deleted, false)))
      .leftJoin(teacher, eq(teacher.id, sections.class_teacher_id))
      .where(and(eq(classes.school_id, schoolId), eq(classes.deleted, false)))
      .orderBy(asc(academicYears.name), asc(classes.class_sequence), asc(sections.name));
  }

  findStudents(schoolId: string) {
    return this.db
      .select({
        system_number: students.system_number,
        admission_number: studentAcademicInfo.admission_number,
        registration_number: studentAcademicInfo.registration_number,
        roll_number: studentAcademicInfo.roll_number,
        first_name: students.first_name,
        last_name: students.last_name,
        gender: students.gender,
        date_of_birth: students.date_of_birth,
        class_name: classes.name,
        section_name: sections.name,
        phone_number: students.phone_number,
        email: students.email,
        status: students.status,
        joining_date: studentAcademicInfo.joining_date,
      })
      .from(students)
      .leftJoin(
        studentAcademicInfo,
        and(
          eq(studentAcademicInfo.student_id, students.id),
          eq(studentAcademicInfo.is_current, true),
          eq(studentAcademicInfo.deleted, false),
        ),
      )
      .leftJoin(classes, eq(classes.id, studentAcademicInfo.class_id))
      .leftJoin(sections, eq(sections.id, studentAcademicInfo.section_id))
      .where(and(eq(students.school_id, schoolId), eq(students.deleted, false)))
      .orderBy(asc(classes.class_sequence), asc(sections.name), asc(students.first_name));
  }

  findParents(schoolId: string) {
    return this.db
      .select({
        student_first_name: students.first_name,
        student_last_name: students.last_name,
        admission_number: studentAcademicInfo.admission_number,
        relation: studentParents.relation,
        first_name: studentParents.first_name,
        last_name: studentParents.last_name,
        dial_code: studentParents.dial_code,
        phone_number: studentParents.phone_number,
        email: studentParents.email,
        occupation: studentParents.occupation,
        is_primary: studentParents.is_primary,
        has_login: studentParents.is_active,
      })
      .from(studentParents)
      .innerJoin(students, eq(students.id, studentParents.student_id))
      .leftJoin(
        studentAcademicInfo,
        and(
          eq(studentAcademicInfo.student_id, students.id),
          eq(studentAcademicInfo.is_current, true),
          eq(studentAcademicInfo.deleted, false),
        ),
      )
      .where(
        and(
          eq(studentParents.school_id, schoolId),
          eq(studentParents.deleted, false),
          eq(students.deleted, false),
        ),
      )
      .orderBy(asc(students.first_name));
  }

  findStaff(schoolId: string) {
    return this.db
      .select({
        employee_code: schoolUsers.employee_code,
        first_name: schoolUsers.first_name,
        last_name: schoolUsers.last_name,
        role: schoolUsers.role,
        dial_code: schoolUsers.dial_code,
        phone_number: schoolUsers.phone_number,
        email: schoolUsers.email,
        gender: schoolUsers.gender,
        joining_date: schoolUsers.joining_date,
        qualification: schoolUsers.qualification,
        is_active: schoolUsers.is_active,
      })
      .from(schoolUsers)
      .where(and(eq(schoolUsers.school_id, schoolId), eq(schoolUsers.deleted, false)))
      .orderBy(asc(schoolUsers.first_name));
  }

  findFeePayments(schoolId: string) {
    return this.db
      .select({
        payment_date: feeBillPayments.payment_date,
        admission_number: studentAcademicInfo.admission_number,
        student_first_name: students.first_name,
        student_last_name: students.last_name,
        fee_type: feeTypes.name,
        bill_month: feeBills.bill_month,
        amount: feeBillPayments.amount,
        payment_mode: feeBillPayments.payment_mode,
        transaction_id: feeBillPayments.transaction_id,
      })
      .from(feeBillPayments)
      .innerJoin(feeBills, eq(feeBills.id, feeBillPayments.bill_id))
      .innerJoin(students, eq(students.id, feeBills.student_id))
      .innerJoin(feeTypes, eq(feeTypes.id, feeBills.fee_type_id))
      .leftJoin(
        studentAcademicInfo,
        and(
          eq(studentAcademicInfo.student_id, students.id),
          eq(studentAcademicInfo.is_current, true),
          eq(studentAcademicInfo.deleted, false),
        ),
      )
      .where(and(eq(feeBillPayments.school_id, schoolId), eq(feeBills.deleted, false)))
      .orderBy(desc(feeBillPayments.payment_date));
  }
}
