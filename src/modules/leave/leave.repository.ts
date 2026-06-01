import { Injectable, Inject } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { leavePolicies, leaveTypes, leaveBalances, teacherLeaveRequests, studentLeaveRequests } from '../../database/drizzle/schema/leave.schema';
import {
  LeavePolicy, NewLeavePolicy, LeaveType, NewLeaveType, LeaveBalance, NewLeaveBalance,
  TeacherLeaveRequest, NewTeacherLeaveRequest, StudentLeaveRequest, NewStudentLeaveRequest,
} from './types/leave.types';

@Injectable()
export class LeaveRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  // Policies
  async findAllPolicies(schoolId: string): Promise<LeavePolicy[]> {
    return this.db.select().from(leavePolicies).where(and(eq(leavePolicies.school_id, schoolId), eq(leavePolicies.deleted, false)));
  }

  async findPolicyById(id: string, schoolId: string): Promise<LeavePolicy | undefined> {
    const [row] = await this.db.select().from(leavePolicies).where(and(eq(leavePolicies.id, id), eq(leavePolicies.school_id, schoolId), eq(leavePolicies.deleted, false)));
    return row;
  }

  async createPolicy(data: NewLeavePolicy): Promise<LeavePolicy> {
    const [row] = await this.db.insert(leavePolicies).values(data).returning();
    return row;
  }

  async updatePolicy(id: string, schoolId: string, data: Partial<NewLeavePolicy>): Promise<LeavePolicy> {
    const [row] = await this.db.update(leavePolicies).set({ ...data, updated_at: new Date() }).where(and(eq(leavePolicies.id, id), eq(leavePolicies.school_id, schoolId))).returning();
    return row;
  }

  // Leave Types
  async findTypesByPolicy(policyId: string, schoolId: string): Promise<LeaveType[]> {
    return this.db.select().from(leaveTypes).where(and(eq(leaveTypes.policy_id, policyId), eq(leaveTypes.school_id, schoolId), eq(leaveTypes.deleted, false)));
  }

  async findTypeById(id: string, schoolId: string): Promise<LeaveType | undefined> {
    const [row] = await this.db.select().from(leaveTypes).where(and(eq(leaveTypes.id, id), eq(leaveTypes.school_id, schoolId), eq(leaveTypes.deleted, false)));
    return row;
  }

  async createLeaveType(data: NewLeaveType): Promise<LeaveType> {
    const [row] = await this.db.insert(leaveTypes).values(data).returning();
    return row;
  }

  async updateLeaveType(id: string, schoolId: string, data: Partial<NewLeaveType>): Promise<LeaveType> {
    const [row] = await this.db.update(leaveTypes).set({ ...data, updated_at: new Date() }).where(and(eq(leaveTypes.id, id), eq(leaveTypes.school_id, schoolId))).returning();
    return row;
  }

  // Balances
  async createBalance(data: NewLeaveBalance): Promise<LeaveBalance> {
    const [row] = await this.db.insert(leaveBalances).values(data).returning();
    return row;
  }

  async findBalancesByStaff(staffId: string, schoolId: string, academicYearId: string): Promise<LeaveBalance[]> {
    return this.db.select().from(leaveBalances).where(and(eq(leaveBalances.staff_id, staffId), eq(leaveBalances.school_id, schoolId), eq(leaveBalances.academic_year_id, academicYearId)));
  }

  async findAllBalances(schoolId: string, academicYearId: string): Promise<LeaveBalance[]> {
    return this.db.select().from(leaveBalances).where(and(eq(leaveBalances.school_id, schoolId), eq(leaveBalances.academic_year_id, academicYearId)));
  }

  async updateBalanceUsed(id: string, delta: number): Promise<void> {
    await this.db.update(leaveBalances).set({ updated_at: new Date(), used: sql`${leaveBalances.used} + ${delta}` }).where(eq(leaveBalances.id, id));
  }

  // Teacher Leave Requests
  async createTeacherRequest(data: NewTeacherLeaveRequest): Promise<TeacherLeaveRequest> {
    const [row] = await this.db.insert(teacherLeaveRequests).values(data).returning();
    return row;
  }

  async findTeacherRequests(schoolId: string, staffId?: string): Promise<TeacherLeaveRequest[]> {
    const conditions = [eq(teacherLeaveRequests.school_id, schoolId)];
    if (staffId) conditions.push(eq(teacherLeaveRequests.staff_id, staffId));
    return this.db.select().from(teacherLeaveRequests).where(and(...conditions)).orderBy(teacherLeaveRequests.created_at);
  }

  async findTeacherRequestById(id: string, schoolId: string): Promise<TeacherLeaveRequest | undefined> {
    const [row] = await this.db.select().from(teacherLeaveRequests).where(and(eq(teacherLeaveRequests.id, id), eq(teacherLeaveRequests.school_id, schoolId)));
    return row;
  }

  async reviewTeacherRequest(id: string, schoolId: string, data: Partial<NewTeacherLeaveRequest>): Promise<TeacherLeaveRequest> {
    const [row] = await this.db.update(teacherLeaveRequests).set({ ...data, updated_at: new Date(), reviewed_at: new Date() }).where(and(eq(teacherLeaveRequests.id, id), eq(teacherLeaveRequests.school_id, schoolId))).returning();
    return row;
  }

  // Student Leave Requests
  async createStudentRequest(data: NewStudentLeaveRequest): Promise<StudentLeaveRequest> {
    const [row] = await this.db.insert(studentLeaveRequests).values(data).returning();
    return row;
  }

  async findStudentRequests(schoolId: string, studentId?: string, appliedBy?: string): Promise<StudentLeaveRequest[]> {
    const conditions = [eq(studentLeaveRequests.school_id, schoolId)];
    if (studentId) conditions.push(eq(studentLeaveRequests.student_id, studentId));
    if (appliedBy) conditions.push(eq(studentLeaveRequests.applied_by, appliedBy));
    return this.db.select().from(studentLeaveRequests).where(and(...conditions)).orderBy(studentLeaveRequests.created_at);
  }

  async findStudentRequestById(id: string, schoolId: string): Promise<StudentLeaveRequest | undefined> {
    const [row] = await this.db.select().from(studentLeaveRequests).where(and(eq(studentLeaveRequests.id, id), eq(studentLeaveRequests.school_id, schoolId)));
    return row;
  }

  async reviewStudentRequest(id: string, schoolId: string, data: Partial<NewStudentLeaveRequest>): Promise<StudentLeaveRequest> {
    const [row] = await this.db.update(studentLeaveRequests).set({ ...data, updated_at: new Date(), reviewed_at: new Date() }).where(and(eq(studentLeaveRequests.id, id), eq(studentLeaveRequests.school_id, schoolId))).returning();
    return row;
  }
}
