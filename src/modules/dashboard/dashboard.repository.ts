import { Injectable, Inject } from '@nestjs/common';
import { eq, and, sql, gte, lte, desc } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import {
  students,
  studentAcademicInfo,
  schoolUsers,
  parents,
  admissionEnquiries,
  attendances,
  feeBills,
  homeworks,
  classes,
  departments,
  subjects,
  schoolEvents,
  academicYears,
  teacherLeaveRequests,
  studentLeaveRequests,
  salaryTransactions,
  financeExpenses,
  financeIncome,
  exams,
} from '../../database/drizzle/schema';

@Injectable()
export class DashboardRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  // ── Core counts ─────────────────────────────────────────────────────────

  async countStudents(schoolId: string): Promise<number> {
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(students)
      .where(and(eq(students.school_id, schoolId), eq(students.deleted, false)));
    return Number(count);
  }

  async countStaff(schoolId: string): Promise<number> {
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schoolUsers)
      .where(and(eq(schoolUsers.school_id, schoolId), eq(schoolUsers.deleted, false)));
    return Number(count);
  }

  async countParents(schoolId: string): Promise<number> {
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(parents)
      .where(and(eq(parents.school_id, schoolId), eq(parents.deleted, false)));
    return Number(count);
  }

  async countClasses(schoolId: string): Promise<number> {
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(classes)
      .where(and(eq(classes.school_id, schoolId), eq(classes.deleted, false)));
    return Number(count);
  }

  async countDepartments(schoolId: string): Promise<number> {
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(departments)
      .where(and(eq(departments.school_id, schoolId), eq(departments.deleted, false)));
    return Number(count);
  }

  async countSubjects(schoolId: string): Promise<number> {
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(subjects)
      .where(and(eq(subjects.school_id, schoolId), eq(subjects.deleted, false)));
    return Number(count);
  }

  // ── Attendance ───────────────────────────────────────────────────────────

  async getTodayAttendanceSummary(schoolId: string, date: string) {
    const results = await this.db
      .select({ status: attendances.status, count: sql<number>`count(*)` })
      .from(attendances)
      .where(and(eq(attendances.school_id, schoolId), eq(attendances.date, date)))
      .groupBy(attendances.status);
    return results;
  }

  async getAttendanceTrend(schoolId: string, days = 7) {
    const from = new Date();
    from.setDate(from.getDate() - days + 1);
    const fromStr = from.toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];

    return this.db
      .select({
        date: attendances.date,
        status: attendances.status,
        count: sql<number>`count(*)`,
      })
      .from(attendances)
      .where(
        and(
          eq(attendances.school_id, schoolId),
          gte(attendances.date, fromStr),
          lte(attendances.date, todayStr),
        ),
      )
      .groupBy(attendances.date, attendances.status)
      .orderBy(attendances.date);
  }

  // ── Fees ─────────────────────────────────────────────────────────────────

  async getPendingFees(schoolId: string): Promise<number> {
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(feeBills)
      .where(
        and(
          eq(feeBills.school_id, schoolId),
          eq(feeBills.status, 'PENDING'),
          eq(feeBills.deleted, false),
        ),
      );
    return Number(count);
  }

  async getFeesCollectionSummary(schoolId: string) {
    const rows = await this.db
      .select({
        status: feeBills.status,
        total: sql<string>`sum(total_amount)`,
        paid: sql<string>`sum(paid_amount)`,
        count: sql<number>`count(*)`,
      })
      .from(feeBills)
      .where(and(eq(feeBills.school_id, schoolId), eq(feeBills.deleted, false)))
      .groupBy(feeBills.status);
    return rows;
  }

  // ── Admissions ───────────────────────────────────────────────────────────

  async getAdmissionStatusBreakdown(schoolId: string) {
    return this.db
      .select({ status: admissionEnquiries.status, count: sql<number>`count(*)` })
      .from(admissionEnquiries)
      .where(and(eq(admissionEnquiries.school_id, schoolId), eq(admissionEnquiries.deleted, false)))
      .groupBy(admissionEnquiries.status);
  }

  // ── Students ─────────────────────────────────────────────────────────────

  async getStudentGenderBreakdown(schoolId: string) {
    return this.db
      .select({ gender: students.gender, count: sql<number>`count(*)` })
      .from(students)
      .where(and(eq(students.school_id, schoolId), eq(students.deleted, false)))
      .groupBy(students.gender);
  }

  async getClasswiseStudentCount(schoolId: string) {
    return this.db
      .select({
        class_id: studentAcademicInfo.class_id,
        class_name: classes.name,
        count: sql<number>`count(*)`,
      })
      .from(studentAcademicInfo)
      .innerJoin(classes, eq(studentAcademicInfo.class_id, classes.id))
      .where(
        and(eq(studentAcademicInfo.school_id, schoolId), eq(studentAcademicInfo.is_current, true)),
      )
      .groupBy(studentAcademicInfo.class_id, classes.name)
      .orderBy(classes.name);
  }

  // ── Leave ────────────────────────────────────────────────────────────────

  async getPendingLeaveRequests(schoolId: string) {
    const [teacherRows, studentRows] = await Promise.all([
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(teacherLeaveRequests)
        .where(
          and(
            eq(teacherLeaveRequests.school_id, schoolId),
            eq(teacherLeaveRequests.status, 'PENDING'),
          ),
        ),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(studentLeaveRequests)
        .where(
          and(
            eq(studentLeaveRequests.school_id, schoolId),
            eq(studentLeaveRequests.status, 'PENDING'),
          ),
        ),
    ]);
    return {
      teacher: Number(teacherRows[0]?.count ?? 0),
      student: Number(studentRows[0]?.count ?? 0),
    };
  }

  // ── Events ───────────────────────────────────────────────────────────────

  async getUpcomingEvents(schoolId: string, limit = 5) {
    const today = new Date().toISOString().split('T')[0];
    return this.db
      .select({
        id: schoolEvents.id,
        name: schoolEvents.name,
        type: schoolEvents.type,
        from_date: schoolEvents.from_date,
        to_date: schoolEvents.to_date,
      })
      .from(schoolEvents)
      .where(
        and(
          eq(schoolEvents.school_id, schoolId),
          eq(schoolEvents.deleted, false),
          gte(schoolEvents.from_date, today),
        ),
      )
      .orderBy(schoolEvents.from_date)
      .limit(limit);
  }

  // ── Academics ────────────────────────────────────────────────────────────

  async getHomeworkStatusBreakdown(schoolId: string) {
    return this.db
      .select({ status: homeworks.status, count: sql<number>`count(*)` })
      .from(homeworks)
      .where(and(eq(homeworks.school_id, schoolId), eq(homeworks.deleted, false)))
      .groupBy(homeworks.status);
  }

  async getRecentHomework(schoolId: string, limit = 5) {
    return this.db
      .select({
        id: homeworks.id,
        title: homeworks.title,
        status: homeworks.status,
        due_date: homeworks.due_date,
      })
      .from(homeworks)
      .where(and(eq(homeworks.school_id, schoolId), eq(homeworks.deleted, false)))
      .orderBy(desc(homeworks.created_at))
      .limit(limit);
  }

  async getUpcomingExams(schoolId: string, limit = 5) {
    return this.db
      .select({
        id: exams.id,
        name: exams.exam_name,
        start_date: exams.start_date,
        end_date: exams.end_date,
      })
      .from(exams)
      .where(and(eq(exams.school_id, schoolId), eq(exams.deleted, false)))
      .orderBy(exams.start_date)
      .limit(limit);
  }

  // ── Finance / Salary ─────────────────────────────────────────────────────

  async getFinanceSummary(schoolId: string) {
    const [income, expenses] = await Promise.all([
      this.db
        .select({ total: sql<string>`coalesce(sum(amount), 0)` })
        .from(financeIncome)
        .where(and(eq(financeIncome.school_id, schoolId), eq(financeIncome.deleted, false))),
      this.db
        .select({ total: sql<string>`coalesce(sum(total_amount), 0)` })
        .from(financeExpenses)
        .where(and(eq(financeExpenses.school_id, schoolId), eq(financeExpenses.deleted, false))),
    ]);
    return {
      totalIncome: Number(income[0]?.total ?? 0),
      totalExpenses: Number(expenses[0]?.total ?? 0),
    };
  }

  async getPendingSalaryCount(schoolId: string): Promise<number> {
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(salaryTransactions)
      .where(
        and(
          eq(salaryTransactions.school_id, schoolId),
          eq(salaryTransactions.status, 'PENDING'),
          eq(salaryTransactions.deleted, false),
        ),
      );
    return Number(count);
  }

  // ── Academic Years ───────────────────────────────────────────────────────

  async getCurrentAcademicYear(schoolId: string) {
    const rows = await this.db
      .select({
        id: academicYears.id,
        name: academicYears.name,
        is_active: academicYears.is_active,
      })
      .from(academicYears)
      .where(and(eq(academicYears.school_id, schoolId), eq(academicYears.is_active, true)))
      .limit(1);
    return rows[0] ?? null;
  }

  // ── Teacher dashboard helpers ─────────────────────────────────────────────

  async getTeacherAssignedHomework(schoolId: string, teacherId: string, limit = 5) {
    return this.db
      .select({
        id: homeworks.id,
        title: homeworks.title,
        status: homeworks.status,
        due_date: homeworks.due_date,
      })
      .from(homeworks)
      .where(
        and(
          eq(homeworks.school_id, schoolId),
          eq(homeworks.assigned_by, teacherId),
          eq(homeworks.deleted, false),
        ),
      )
      .orderBy(desc(homeworks.created_at))
      .limit(limit);
  }

  async getSubjectAllocation(schoolId: string, classSectionId: string) {
    return this.db
      .select({ subject_id: homeworks.subject_id, count: sql<number>`count(*)` })
      .from(homeworks)
      .where(
        and(
          eq(homeworks.school_id, schoolId),
          eq(homeworks.class_id, classSectionId),
          eq(homeworks.deleted, false),
        ),
      )
      .groupBy(homeworks.subject_id);
  }
}
