import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import {
  academicYears,
  classes,
  financeAccounts,
  financeExpenses,
  financeHeads,
  financeIncome,
  roles,
  schoolUsers,
  sections,
  studentAcademicInfo,
  studentParents,
  students,
} from '../../database/drizzle/schema';

const fullName = sql<string>`trim(concat(${students.first_name}, ' ', coalesce(${students.last_name}, '')))`;
const staffName = sql<string>`trim(concat(${schoolUsers.first_name}, ' ', coalesce(${schoolUsers.last_name}, '')))`;

export type AcademicNumberField = 'admission_number' | 'registration_number';
export type StaffUniqueField = 'email' | 'employee_code' | 'rfid_card_number';

@Injectable()
export class BulkImportRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  findAcademicYears(schoolId: string) {
    return this.db
      .select({
        id: academicYears.id,
        name: academicYears.name,
        is_current: academicYears.is_current,
        is_frozen: academicYears.is_frozen,
        is_enabled: academicYears.is_enabled,
        start_date: academicYears.start_date,
      })
      .from(academicYears)
      .where(and(eq(academicYears.school_id, schoolId), eq(academicYears.is_active, true)))
      .orderBy(academicYears.start_date);
  }

  findClasses(schoolId: string) {
    return this.db
      .select({
        id: classes.id,
        name: classes.name,
        academic_year_id: classes.academic_year_id,
        is_active: classes.is_active,
      })
      .from(classes)
      .where(and(eq(classes.school_id, schoolId), eq(classes.deleted, false)))
      .orderBy(classes.class_sequence, classes.name);
  }

  findSections(schoolId: string) {
    return this.db
      .select({
        id: sections.id,
        name: sections.name,
        class_id: sections.class_id,
        max_strength: sections.max_strength,
        is_active: sections.is_active,
      })
      .from(sections)
      .where(and(eq(sections.school_id, schoolId), eq(sections.deleted, false)))
      .orderBy(sections.name);
  }

  private currentStudentConditions(schoolId: string) {
    return [
      eq(studentAcademicInfo.school_id, schoolId),
      eq(studentAcademicInfo.is_current, true),
      eq(studentAcademicInfo.deleted, false),
      eq(students.deleted, false),
    ];
  }

  async countBySection(schoolId: string): Promise<{ section_id: string; total: number }[]> {
    const rows = await this.db
      .select({ section_id: studentAcademicInfo.section_id, total: sql<number>`count(*)` })
      .from(studentAcademicInfo)
      .innerJoin(students, eq(students.id, studentAcademicInfo.student_id))
      .where(
        and(...this.currentStudentConditions(schoolId), isNotNull(studentAcademicInfo.section_id)),
      )
      .groupBy(studentAcademicInfo.section_id);
    return rows.map((r) => ({ section_id: r.section_id!, total: Number(r.total) }));
  }

  async findStudentsByAcademicNumber(
    schoolId: string,
    field: AcademicNumberField,
    values: string[],
  ) {
    if (!values.length) return [];
    return this.db
      .select({
        value: studentAcademicInfo[field],
        student_id: students.id,
        name: fullName,
      })
      .from(studentAcademicInfo)
      .innerJoin(students, eq(students.id, studentAcademicInfo.student_id))
      .where(
        and(
          ...this.currentStudentConditions(schoolId),
          inArray(studentAcademicInfo[field], values),
        ),
      );
  }

  async findRollNumbers(schoolId: string, classIds: string[]) {
    if (!classIds.length) return [];
    return this.db
      .select({
        academic_year_id: studentAcademicInfo.academic_year_id,
        class_id: studentAcademicInfo.class_id,
        section_id: studentAcademicInfo.section_id,
        roll_number: studentAcademicInfo.roll_number,
      })
      .from(studentAcademicInfo)
      .innerJoin(students, eq(students.id, studentAcademicInfo.student_id))
      .where(
        and(
          ...this.currentStudentConditions(schoolId),
          inArray(studentAcademicInfo.class_id, classIds),
          isNotNull(studentAcademicInfo.roll_number),
        ),
      );
  }

  async findStudentsByAadhaar(schoolId: string, values: string[]) {
    if (!values.length) return [];
    return this.db
      .select({ value: students.aadhaar_number, name: fullName })
      .from(students)
      .where(
        and(
          eq(students.school_id, schoolId),
          eq(students.deleted, false),
          inArray(students.aadhaar_number, values),
        ),
      );
  }

  async findStudentIdentities(schoolId: string, firstNames: string[]) {
    if (!firstNames.length) return [];
    return this.db
      .select({
        first_name: students.first_name,
        last_name: students.last_name,
        date_of_birth: students.date_of_birth,
        parent_phone: studentParents.phone_number,
        admission_number: studentAcademicInfo.admission_number,
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
      .leftJoin(
        studentParents,
        and(eq(studentParents.student_id, students.id), eq(studentParents.deleted, false)),
      )
      .where(
        and(
          eq(students.school_id, schoolId),
          eq(students.deleted, false),
          inArray(sql`lower(${students.first_name})`, firstNames),
        ),
      );
  }

  findRoles(schoolId: string) {
    return this.db
      .select({ id: roles.id, name: roles.name, slug: roles.slug, is_system: roles.is_system })
      .from(roles)
      .where(
        and(eq(roles.school_id, schoolId), eq(roles.deleted, false), eq(roles.is_active, true)),
      )
      .orderBy(roles.name);
  }

  async findStaffByPhones(phones: string[]) {
    if (!phones.length) return [];
    return this.db
      .select({
        id: schoolUsers.id,
        school_id: schoolUsers.school_id,
        phone_number: schoolUsers.phone_number,
        employee_code: schoolUsers.employee_code,
        name: staffName,
      })
      .from(schoolUsers)
      .where(
        and(
          eq(schoolUsers.deleted, false),
          eq(schoolUsers.dial_code, '+91'),
          inArray(schoolUsers.phone_number, phones),
        ),
      );
  }

  async findStaffByField(schoolId: string, field: StaffUniqueField, values: string[]) {
    if (!values.length) return [];
    return this.db
      .select({ id: schoolUsers.id, value: schoolUsers[field], name: staffName })
      .from(schoolUsers)
      .where(
        and(
          eq(schoolUsers.school_id, schoolId),
          eq(schoolUsers.deleted, false),
          inArray(sql`lower(${schoolUsers[field]})`, values),
        ),
      );
  }

  findFinanceAccounts(schoolId: string) {
    return this.db
      .select({
        id: financeAccounts.id,
        name: financeAccounts.name,
        is_enabled: financeAccounts.is_enabled,
        current_balance: financeAccounts.current_balance,
        account_start_date: financeAccounts.account_start_date,
      })
      .from(financeAccounts)
      .where(and(eq(financeAccounts.school_id, schoolId), eq(financeAccounts.deleted, false)))
      .orderBy(financeAccounts.name);
  }

  findFinanceHeads(schoolId: string) {
    return this.db
      .select({
        id: financeHeads.id,
        name: financeHeads.name,
        head_type: financeHeads.head_type,
        is_enabled: financeHeads.is_enabled,
      })
      .from(financeHeads)
      .where(and(eq(financeHeads.school_id, schoolId), eq(financeHeads.deleted, false)))
      .orderBy(financeHeads.name);
  }

  async findIncomeOnDates(schoolId: string, dates: string[]) {
    if (!dates.length) return [];
    return this.db
      .select({
        head_id: financeIncome.income_head_id,
        account_id: financeIncome.to_account_id,
        amount: financeIncome.amount,
        date: financeIncome.date_of_income,
        party_id: financeIncome.student_id,
      })
      .from(financeIncome)
      .where(
        and(
          eq(financeIncome.school_id, schoolId),
          eq(financeIncome.deleted, false),
          inArray(financeIncome.date_of_income, dates),
        ),
      );
  }

  async findExpensesOnDates(schoolId: string, dates: string[]) {
    if (!dates.length) return [];
    return this.db
      .select({
        head_id: financeExpenses.expense_head_id,
        account_id: financeExpenses.from_account_id,
        amount: financeExpenses.total_amount,
        date: financeExpenses.date_of_expense,
        party_id: financeExpenses.employee_id,
      })
      .from(financeExpenses)
      .where(
        and(
          eq(financeExpenses.school_id, schoolId),
          eq(financeExpenses.deleted, false),
          inArray(financeExpenses.date_of_expense, dates),
        ),
      );
  }
}
