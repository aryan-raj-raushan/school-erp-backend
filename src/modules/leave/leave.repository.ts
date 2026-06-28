import { Injectable, Inject } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import {
  leavePolicies,
  leaveTypesEmployee as leaveTypes,
  leaveBalances,
  teacherLeaveRequests,
  studentLeaveRequests,
} from '../../database/drizzle/schema/leave.schema';
import {
  leaveApprovalWorkflow,
  leaveWorkflowStepTemplates,
  leaveApprovalSteps,
} from '../../database/drizzle/schema/leave-approval-workflow.schema';
import { InferInsertModel, InferSelectModel } from 'drizzle-orm';

type NewWorkflow = InferInsertModel<typeof leaveApprovalWorkflow>;
type NewStepTemplate = InferInsertModel<typeof leaveWorkflowStepTemplates>;
type NewApprovalStep = InferInsertModel<typeof leaveApprovalSteps>;
type ApprovalStep = InferSelectModel<typeof leaveApprovalSteps>;
import {
  LeavePolicy,
  NewLeavePolicy,
  LeaveType,
  NewLeaveType,
  LeaveBalance,
  NewLeaveBalance,
  TeacherLeaveRequest,
  NewTeacherLeaveRequest,
  StudentLeaveRequest,
  NewStudentLeaveRequest,
} from './types/leave.types';

@Injectable()
export class LeaveRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  // Policies
  async findAllPolicies(schoolId: string): Promise<LeavePolicy[]> {
    return this.db
      .select()
      .from(leavePolicies)
      .where(and(eq(leavePolicies.school_id, schoolId), eq(leavePolicies.deleted, false)));
  }

  async findPolicyById(id: string, schoolId: string): Promise<LeavePolicy | undefined> {
    const [row] = await this.db
      .select()
      .from(leavePolicies)
      .where(
        and(
          eq(leavePolicies.id, id),
          eq(leavePolicies.school_id, schoolId),
          eq(leavePolicies.deleted, false),
        ),
      );
    return row;
  }

  async createPolicy(data: NewLeavePolicy): Promise<LeavePolicy> {
    const [row] = await this.db.insert(leavePolicies).values(data).returning();
    return row;
  }

  async updatePolicy(
    id: string,
    schoolId: string,
    data: Partial<NewLeavePolicy>,
  ): Promise<LeavePolicy> {
    const [row] = await this.db
      .update(leavePolicies)
      .set({ ...data, updated_at: new Date() })
      .where(and(eq(leavePolicies.id, id), eq(leavePolicies.school_id, schoolId)))
      .returning();
    return row;
  }

  // Leave Types
  async findTypesByPolicy(policyId: string, schoolId: string): Promise<LeaveType[]> {
    return this.db
      .select()
      .from(leaveTypes)
      .where(
        and(
          eq(leaveTypes.policy_id, policyId),
          eq(leaveTypes.school_id, schoolId),
          eq(leaveTypes.deleted, false),
        ),
      );
  }

  async findTypeById(id: string, schoolId: string): Promise<LeaveType | undefined> {
    const [row] = await this.db
      .select()
      .from(leaveTypes)
      .where(
        and(
          eq(leaveTypes.id, id),
          eq(leaveTypes.school_id, schoolId),
          eq(leaveTypes.deleted, false),
        ),
      );
    return row;
  }

  async createLeaveType(data: NewLeaveType): Promise<LeaveType> {
    const [row] = await this.db.insert(leaveTypes).values(data).returning();
    return row;
  }

  async updateLeaveType(
    id: string,
    schoolId: string,
    data: Partial<NewLeaveType>,
  ): Promise<LeaveType> {
    const [row] = await this.db
      .update(leaveTypes)
      .set({ ...data, updated_at: new Date() })
      .where(and(eq(leaveTypes.id, id), eq(leaveTypes.school_id, schoolId)))
      .returning();
    return row;
  }

  // Balances
  async createBalance(data: NewLeaveBalance): Promise<LeaveBalance> {
    const [row] = await this.db.insert(leaveBalances).values(data).returning();
    return row;
  }

  async findBalancesByStaff(
    staffId: string,
    schoolId: string,
    academicYearId: string,
  ): Promise<LeaveBalance[]> {
    return this.db
      .select()
      .from(leaveBalances)
      .where(
        and(
          eq(leaveBalances.staff_id, staffId),
          eq(leaveBalances.school_id, schoolId),
          eq(leaveBalances.academic_year_id, academicYearId),
        ),
      );
  }

  async findAllBalances(schoolId: string, academicYearId: string): Promise<LeaveBalance[]> {
    return this.db
      .select()
      .from(leaveBalances)
      .where(
        and(
          eq(leaveBalances.school_id, schoolId),
          eq(leaveBalances.academic_year_id, academicYearId),
        ),
      );
  }

  async updateBalanceUsed(id: string, delta: number): Promise<void> {
    await this.db
      .update(leaveBalances)
      .set({ updated_at: new Date(), used: sql`${leaveBalances.used} + ${delta}` })
      .where(eq(leaveBalances.id, id));
  }

  // Teacher Leave Requests
  async createTeacherRequest(data: NewTeacherLeaveRequest): Promise<TeacherLeaveRequest> {
    const [row] = await this.db.insert(teacherLeaveRequests).values(data).returning();
    return row;
  }

  async findTeacherRequests(schoolId: string, staffId?: string): Promise<TeacherLeaveRequest[]> {
    const conditions = [eq(teacherLeaveRequests.school_id, schoolId)];
    if (staffId) conditions.push(eq(teacherLeaveRequests.staff_id, staffId));
    return this.db
      .select()
      .from(teacherLeaveRequests)
      .where(and(...conditions))
      .orderBy(teacherLeaveRequests.created_at);
  }

  async findTeacherRequestById(
    id: string,
    schoolId: string,
  ): Promise<TeacherLeaveRequest | undefined> {
    const [row] = await this.db
      .select()
      .from(teacherLeaveRequests)
      .where(and(eq(teacherLeaveRequests.id, id), eq(teacherLeaveRequests.school_id, schoolId)));
    return row;
  }

  async reviewTeacherRequest(
    id: string,
    schoolId: string,
    data: Partial<NewTeacherLeaveRequest>,
  ): Promise<TeacherLeaveRequest> {
    const [row] = await this.db
      .update(teacherLeaveRequests)
      .set({ ...data, updated_at: new Date(), reviewed_at: new Date() })
      .where(and(eq(teacherLeaveRequests.id, id), eq(teacherLeaveRequests.school_id, schoolId)))
      .returning();
    return row;
  }

  // Student Leave Requests
  async createStudentRequest(data: NewStudentLeaveRequest): Promise<StudentLeaveRequest> {
    const [row] = await this.db.insert(studentLeaveRequests).values(data).returning();
    return row;
  }

  async findStudentRequests(
    schoolId: string,
    studentId?: string,
    appliedBy?: string,
  ): Promise<StudentLeaveRequest[]> {
    const conditions = [eq(studentLeaveRequests.school_id, schoolId)];
    if (studentId) conditions.push(eq(studentLeaveRequests.student_id, studentId));
    if (appliedBy) conditions.push(eq(studentLeaveRequests.applied_by, appliedBy));
    return this.db
      .select()
      .from(studentLeaveRequests)
      .where(and(...conditions))
      .orderBy(studentLeaveRequests.created_at);
  }

  async findStudentRequestById(
    id: string,
    schoolId: string,
  ): Promise<StudentLeaveRequest | undefined> {
    const [row] = await this.db
      .select()
      .from(studentLeaveRequests)
      .where(and(eq(studentLeaveRequests.id, id), eq(studentLeaveRequests.school_id, schoolId)));
    return row;
  }

  async reviewStudentRequest(
    id: string,
    schoolId: string,
    data: Partial<NewStudentLeaveRequest>,
  ): Promise<StudentLeaveRequest> {
    const [row] = await this.db
      .update(studentLeaveRequests)
      .set({ ...data, updated_at: new Date(), reviewed_at: new Date() })
      .where(and(eq(studentLeaveRequests.id, id), eq(studentLeaveRequests.school_id, schoolId)))
      .returning();
    return row;
  }

  // ─── Approval Workflows ────────────────────────────────────────────────────

  async createWorkflow(data: NewWorkflow) {
    const [row] = await this.db.insert(leaveApprovalWorkflow).values(data).returning();
    return row;
  }

  async findWorkflows(schoolId: string) {
    return this.db
      .select()
      .from(leaveApprovalWorkflow)
      .where(eq(leaveApprovalWorkflow.school_id, schoolId));
  }

  async findActiveWorkflow(schoolId: string) {
    const [row] = await this.db
      .select()
      .from(leaveApprovalWorkflow)
      .where(and(eq(leaveApprovalWorkflow.school_id, schoolId), eq(leaveApprovalWorkflow.is_active, true)))
      .limit(1);
    return row;
  }

  async createStepTemplate(data: NewStepTemplate) {
    const [row] = await this.db.insert(leaveWorkflowStepTemplates).values(data).returning();
    return row;
  }

  async findStepTemplates(workflowId: string) {
    return this.db
      .select()
      .from(leaveWorkflowStepTemplates)
      .where(eq(leaveWorkflowStepTemplates.workflow_id, workflowId))
      .orderBy(leaveWorkflowStepTemplates.step_order);
  }

  async createApprovalStep(data: NewApprovalStep) {
    const [row] = await this.db.insert(leaveApprovalSteps).values(data).returning();
    return row;
  }

  async findApprovalSteps(leaveRequestId: string): Promise<ApprovalStep[]> {
    return this.db
      .select()
      .from(leaveApprovalSteps)
      .where(eq(leaveApprovalSteps.leave_request_id, leaveRequestId))
      .orderBy(leaveApprovalSteps.step_order);
  }

  async findPendingStep(leaveRequestId: string): Promise<ApprovalStep | undefined> {
    const [row] = await this.db
      .select()
      .from(leaveApprovalSteps)
      .where(
        and(
          eq(leaveApprovalSteps.leave_request_id, leaveRequestId),
          eq(leaveApprovalSteps.status, 'PENDING'),
        ),
      )
      .orderBy(leaveApprovalSteps.step_order)
      .limit(1);
    return row;
  }

  async updateApprovalStep(stepId: string, data: Partial<NewApprovalStep>) {
    const [row] = await this.db
      .update(leaveApprovalSteps)
      .set({ ...data, decided_at: new Date() })
      .where(eq(leaveApprovalSteps.id, stepId))
      .returning();
    return row;
  }
}
