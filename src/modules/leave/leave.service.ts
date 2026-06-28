import { Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { LeaveRepository } from './leave.repository';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { eq, and } from 'drizzle-orm';
import { attendances } from '../../database/drizzle/schema/attendance.schema';
import { studentAcademicInfo } from '../../database/drizzle/schema/students.schema';
import { academicYears } from '../../database/drizzle/schema/academic-years.schema';
import { staffAttendances } from '../../database/drizzle/schema/staff-attendance.schema';
import {
  CreateLeavePolicyDto,
  UpdateLeavePolicyDto,
  UpdateLeaveTypeDto,
  ApplyTeacherLeaveDto,
  ReviewLeaveDto,
  ApplyStudentLeaveDto,
} from './dto/leave.dto';
import {
  LeavePolicy,
  LeaveType,
  LeaveBalance,
  TeacherLeaveRequest,
  StudentLeaveRequest,
} from './types/leave.types';
import { CacheTTL } from '../../shared/constants';

@Injectable()
export class LeaveService {
  constructor(
    private readonly leaveRepo: LeaveRepository,
    private readonly redisService: RedisService,
    @Inject(DRIZZLE_ORM) private readonly db: DrizzleDB,
  ) {}

  private cacheKey(schoolId: string) {
    return `leave:${schoolId}`;
  }

  // Policies
  async findAllPolicies(schoolId: string): Promise<LeavePolicy[]> {
    return this.redisService.getOrSet(`${this.cacheKey(schoolId)}:policies`, CacheTTL.MEDIUM, () =>
      this.leaveRepo.findAllPolicies(schoolId),
    );
  }

  async findPolicyById(id: string, schoolId: string): Promise<LeavePolicy> {
    const policy = await this.leaveRepo.findPolicyById(id, schoolId);
    if (!policy) throw new NotFoundException(`Leave policy with id '${id}' not found`);
    return policy;
  }

  async createPolicy(
    dto: CreateLeavePolicyDto,
    schoolId: string,
  ): Promise<{ policy: LeavePolicy; leave_types: LeaveType[] }> {
    const policy = await this.leaveRepo.createPolicy({
      id: generateId(),
      school_id: schoolId,
      name: dto.name,
      description: dto.description,
      academic_year_id: dto.academic_year_id,
    });
    const leave_types: LeaveType[] = [];
    for (const lt of dto.leave_types) {
      leave_types.push(
        await this.leaveRepo.createLeaveType({
          id: generateId(),
          school_id: schoolId,
          policy_id: policy.id,
          ...lt,
        }),
      );
    }
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return { policy, leave_types };
  }

  async updatePolicy(
    id: string,
    schoolId: string,
    dto: UpdateLeavePolicyDto,
  ): Promise<LeavePolicy> {
    await this.findPolicyById(id, schoolId);
    const updated = await this.leaveRepo.updatePolicy(id, schoolId, {
      name: dto.name,
      description: dto.description,
    });
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return updated;
  }

  async updateLeaveType(id: string, schoolId: string, dto: UpdateLeaveTypeDto): Promise<LeaveType> {
    const lt = await this.leaveRepo.findTypeById(id, schoolId);
    if (!lt) throw new NotFoundException(`Leave type with id '${id}' not found`);
    const updated = await this.leaveRepo.updateLeaveType(id, schoolId, dto);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return updated;
  }

  async provisionLeaveBalances(
    policyId: string,
    schoolId: string,
    staffIds: string[],
    academicYearId: string,
  ): Promise<LeaveBalance[]> {
    const types = await this.leaveRepo.findTypesByPolicy(policyId, schoolId);
    const balances: LeaveBalance[] = [];
    for (const staffId of staffIds) {
      for (const lt of types) {
        balances.push(
          await this.leaveRepo.createBalance({
            id: generateId(),
            school_id: schoolId,
            staff_id: staffId,
            leave_type_id: lt.id,
            allocated: lt.max_days,
            academic_year_id: academicYearId,
          }),
        );
      }
    }
    return balances;
  }

  // ─── Approval Workflows ────────────────────────────────────────────────────

  async createWorkflow(schoolId: string, name: string, steps: { approver_role: string; approver_id?: string }[]) {
    const workflow = await this.leaveRepo.createWorkflow({ id: generateId(), school_id: schoolId, name, is_active: true });
    for (let i = 0; i < steps.length; i++) {
      await this.leaveRepo.createStepTemplate({
        id: generateId(),
        workflow_id: workflow.id,
        step_order: i + 1,
        approver_role: steps[i].approver_role as 'HOD' | 'PRINCIPAL' | 'HR' | 'CLASS_TEACHER' | 'ADMIN',
        ...(steps[i].approver_id ? { approver_id: steps[i].approver_id } : {}),
      });
    }
    const stepTemplates = await this.leaveRepo.findStepTemplates(workflow.id);
    return { ...workflow, steps: stepTemplates };
  }

  async listWorkflows(schoolId: string) {
    const workflows = await this.leaveRepo.findWorkflows(schoolId);
    const result = [];
    for (const wf of workflows) {
      const steps = await this.leaveRepo.findStepTemplates(wf.id);
      result.push({ ...wf, steps });
    }
    return result;
  }

  async getApprovalSteps(leaveRequestId: string) {
    return this.leaveRepo.findApprovalSteps(leaveRequestId);
  }

  async approveLeaveStep(
    stepId: string,
    approverId: string,
    status: 'APPROVED' | 'REJECTED',
    remarks?: string,
  ) {
    const steps = await this.leaveRepo.findApprovalSteps(stepId);
    const step = steps.find((s) => s.id === stepId);
    if (!step) throw new NotFoundException('Approval step not found');
    if (step.status !== 'PENDING') throw new ForbiddenException('Step already decided');

    await this.leaveRepo.updateApprovalStep(stepId, { status, approver_id: approverId, remarks });

    if (status === 'REJECTED') {
      if (step.leave_type === 'TEACHER') {
        await this.leaveRepo.reviewTeacherRequest(step.leave_request_id, step.school_id, {
          status: 'REJECTED',
          reviewed_by: approverId,
          reviewer_remarks: remarks,
        });
      } else {
        await this.leaveRepo.reviewStudentRequest(step.leave_request_id, step.school_id, {
          status: 'REJECTED',
          reviewed_by: approverId,
          reviewer_remarks: remarks,
        });
      }
    } else {
      const allSteps = await this.leaveRepo.findApprovalSteps(step.leave_request_id);
      const allApproved = allSteps.every((s) => s.id === stepId || s.status === 'APPROVED');
      if (allApproved) {
        if (step.leave_type === 'TEACHER') {
          const req = await this.leaveRepo.findTeacherRequestById(step.leave_request_id, step.school_id);
          if (req) {
            await this.leaveRepo.reviewTeacherRequest(step.leave_request_id, step.school_id, {
              status: 'APPROVED',
              reviewed_by: approverId,
              reviewer_remarks: remarks,
            });
            await this.syncStaffAttendanceForLeave(step.school_id, req.staff_id, req.from_date, req.to_date, 'LEAVE');
          }
        } else {
          const req = await this.leaveRepo.findStudentRequestById(step.leave_request_id, step.school_id);
          if (req) {
            await this.leaveRepo.reviewStudentRequest(step.leave_request_id, step.school_id, {
              status: 'APPROVED',
              reviewed_by: approverId,
              reviewer_remarks: remarks,
            });
            await this.syncStudentAttendanceForLeave(step.school_id, req.student_id, req.from_date, req.to_date, 'LEAVE');
          }
        }
      }
    }
    return this.leaveRepo.findApprovalSteps(step.leave_request_id);
  }

  private async createStepsFromWorkflow(leaveRequestId: string, leaveType: 'TEACHER' | 'STUDENT', schoolId: string) {
    const workflow = await this.leaveRepo.findActiveWorkflow(schoolId);
    if (!workflow) return;
    const templates = await this.leaveRepo.findStepTemplates(workflow.id);
    for (const t of templates) {
      await this.leaveRepo.createApprovalStep({
        id: generateId(),
        school_id: schoolId,
        leave_request_id: leaveRequestId,
        leave_type: leaveType,
        step_order: t.step_order,
        approver_role: t.approver_role,
        ...(t.approver_id ? { approver_id: t.approver_id } : {}),
        status: 'PENDING',
      });
    }
  }

  // Teacher Leave
  async applyTeacherLeave(
    dto: ApplyTeacherLeaveDto,
    schoolId: string,
    staffId: string,
  ): Promise<TeacherLeaveRequest> {
    const from = new Date(dto.from_date);
    const to = new Date(dto.to_date);
    const totalDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const request = await this.leaveRepo.createTeacherRequest({
      id: generateId(),
      school_id: schoolId,
      staff_id: staffId,
      leave_type_id: dto.leave_type_id,
      from_date: dto.from_date,
      to_date: dto.to_date,
      total_days: totalDays,
      reason: dto.reason,
    });
    await this.createStepsFromWorkflow(request.id, 'TEACHER', schoolId);
    return request;
  }

  async getMyTeacherRequests(schoolId: string, staffId: string): Promise<TeacherLeaveRequest[]> {
    return this.leaveRepo.findTeacherRequests(schoolId, staffId);
  }

  async getMyTeacherSummary(
    schoolId: string,
    staffId: string,
    academicYearId: string,
  ): Promise<LeaveBalance[]> {
    return this.leaveRepo.findBalancesByStaff(staffId, schoolId, academicYearId);
  }

  async getAllTeacherRequests(schoolId: string): Promise<TeacherLeaveRequest[]> {
    return this.leaveRepo.findTeacherRequests(schoolId);
  }

  async getStaffSummary(schoolId: string, academicYearId: string): Promise<LeaveBalance[]> {
    return this.leaveRepo.findAllBalances(schoolId, academicYearId);
  }

  async reviewTeacherLeave(
    requestId: string,
    schoolId: string,
    reviewerId: string,
    dto: ReviewLeaveDto,
  ): Promise<TeacherLeaveRequest> {
    const req = await this.leaveRepo.findTeacherRequestById(requestId, schoolId);
    if (!req) throw new NotFoundException(`Leave request with id '${requestId}' not found`);
    const updated = await this.leaveRepo.reviewTeacherRequest(requestId, schoolId, {
      status: dto.status,
      reviewed_by: reviewerId,
      reviewer_remarks: dto.reviewer_remarks,
    });
    if (dto.status === 'APPROVED') {
      await this.syncStaffAttendanceForLeave(schoolId, req.staff_id, req.from_date, req.to_date, 'LEAVE');
    } else if (dto.status === 'REJECTED') {
      await this.syncStaffAttendanceForLeave(schoolId, req.staff_id, req.from_date, req.to_date, 'ABSENT');
    }
    return updated;
  }

  async getTeacherRequestById(requestId: string, schoolId: string): Promise<TeacherLeaveRequest> {
    const req = await this.leaveRepo.findTeacherRequestById(requestId, schoolId);
    if (!req) throw new NotFoundException(`Leave request with id '${requestId}' not found`);
    return req;
  }

  // Student Leave
  async getAllStudentRequests(schoolId: string): Promise<StudentLeaveRequest[]> {
    return this.leaveRepo.findStudentRequests(schoolId);
  }

  async reviewStudentLeave(
    requestId: string,
    schoolId: string,
    reviewerId: string,
    dto: ReviewLeaveDto,
  ): Promise<StudentLeaveRequest> {
    const req = await this.leaveRepo.findStudentRequestById(requestId, schoolId);
    if (!req) throw new NotFoundException(`Leave request with id '${requestId}' not found`);
    const updated = await this.leaveRepo.reviewStudentRequest(requestId, schoolId, {
      status: dto.status,
      reviewed_by: reviewerId,
      reviewer_remarks: dto.reviewer_remarks,
    });
    if (dto.status === 'APPROVED') {
      await this.syncStudentAttendanceForLeave(schoolId, req.student_id, req.from_date, req.to_date, 'LEAVE');
    } else if (dto.status === 'REJECTED') {
      await this.syncStudentAttendanceForLeave(schoolId, req.student_id, req.from_date, req.to_date, 'ABSENT');
    }
    return updated;
  }

  async getStudentRequestById(requestId: string, schoolId: string): Promise<StudentLeaveRequest> {
    const req = await this.leaveRepo.findStudentRequestById(requestId, schoolId);
    if (!req) throw new NotFoundException(`Leave request with id '${requestId}' not found`);
    return req;
  }

  // Parent Leave
  async applyStudentLeave(
    dto: ApplyStudentLeaveDto,
    schoolId: string,
    appliedBy: string,
  ): Promise<StudentLeaveRequest> {
    const from = new Date(dto.from_date);
    const to = new Date(dto.to_date);
    const totalDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const request = await this.leaveRepo.createStudentRequest({
      id: generateId(),
      school_id: schoolId,
      student_id: dto.student_id,
      applied_by: appliedBy,
      from_date: dto.from_date,
      to_date: dto.to_date,
      total_days: totalDays,
      reason: dto.reason,
    });
    await this.createStepsFromWorkflow(request.id, 'STUDENT', schoolId);
    return request;
  }

  async getParentRequests(schoolId: string, appliedBy: string): Promise<StudentLeaveRequest[]> {
    return this.leaveRepo.findStudentRequests(schoolId, undefined, appliedBy);
  }

  async getStudentLeaveBalanceSummary(
    studentId: string,
    schoolId: string,
  ): Promise<{ total_days_requested: number; approved: number; pending: number }> {
    const requests = await this.leaveRepo.findStudentRequests(schoolId, studentId);
    return {
      total_days_requested: requests.reduce((s, r) => s + r.total_days, 0),
      approved: requests
        .filter((r) => r.status === 'APPROVED')
        .reduce((s, r) => s + r.total_days, 0),
      pending: requests.filter((r) => r.status === 'PENDING').reduce((s, r) => s + r.total_days, 0),
    };
  }

  private async syncStaffAttendanceForLeave(
    schoolId: string,
    staffId: string,
    startDate: string,
    endDate: string,
    status: 'LEAVE' | 'ABSENT',
  ): Promise<void> {
    const dates = this.getDateRange(startDate, endDate);
    for (const date of dates) {
      await this.db
        .insert(staffAttendances)
        .values({
          id: generateId(),
          school_id: schoolId,
          staff_id: staffId,
          date,
          status,
          marked_by: 'leave-sync',
          is_late: false,
        })
        .onConflictDoUpdate({
          target: [staffAttendances.staff_id, staffAttendances.date],
          set: { status, marked_by: 'leave-sync', updated_at: new Date() },
        });
    }
  }

  private async syncStudentAttendanceForLeave(
    schoolId: string,
    studentId: string,
    startDate: string,
    endDate: string,
    status: 'LEAVE' | 'ABSENT',
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

    const dates = this.getDateRange(startDate, endDate);
    for (const date of dates) {
      await this.db
        .insert(attendances)
        .values({
          id: generateId(),
          school_id: schoolId,
          student_id: studentId,
          academic_year_id: currentYear.id,
          class_section_id: academic.section_id,
          date,
          session: 'MORNING',
          status,
          marked_by: 'leave-sync',
          is_late: false,
        })
        .onConflictDoUpdate({
          target: [attendances.student_id, attendances.date, attendances.session],
          set: { status, marked_by: 'leave-sync', updated_at: new Date() },
        });
    }
  }

  private getDateRange(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const cur = new Date(start);
    while (cur <= end) {
      dates.push(cur.toISOString().split('T')[0]);
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  }
}
