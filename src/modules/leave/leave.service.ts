import { Injectable, NotFoundException } from '@nestjs/common';
import { LeaveRepository } from './leave.repository';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { CreateLeavePolicyDto, UpdateLeavePolicyDto, UpdateLeaveTypeDto, ApplyTeacherLeaveDto, ReviewLeaveDto, ApplyStudentLeaveDto } from './dto/leave.dto';
import { LeavePolicy, LeaveType, LeaveBalance, TeacherLeaveRequest, StudentLeaveRequest } from './types/leave.types';

const CACHE_TTL = 120;

@Injectable()
export class LeaveService {
  constructor(
    private readonly leaveRepo: LeaveRepository,
    private readonly redisService: RedisService,
  ) {}

  private cacheKey(schoolId: string) { return `leave:${schoolId}`; }

  // Policies
  async findAllPolicies(schoolId: string): Promise<LeavePolicy[]> {
    return this.redisService.getOrSet(`${this.cacheKey(schoolId)}:policies`, CACHE_TTL, () => this.leaveRepo.findAllPolicies(schoolId));
  }

  async findPolicyById(id: string, schoolId: string): Promise<LeavePolicy> {
    const policy = await this.leaveRepo.findPolicyById(id, schoolId);
    if (!policy) throw new NotFoundException(`Leave policy with id '${id}' not found`);
    return policy;
  }

  async createPolicy(dto: CreateLeavePolicyDto, schoolId: string): Promise<{ policy: LeavePolicy; leave_types: LeaveType[] }> {
    const policy = await this.leaveRepo.createPolicy({ id: generateId(), school_id: schoolId, name: dto.name, description: dto.description, academic_year_id: dto.academic_year_id });
    const leave_types: LeaveType[] = [];
    for (const lt of dto.leave_types) {
      leave_types.push(await this.leaveRepo.createLeaveType({ id: generateId(), school_id: schoolId, policy_id: policy.id, ...lt }));
    }
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return { policy, leave_types };
  }

  async updatePolicy(id: string, schoolId: string, dto: UpdateLeavePolicyDto): Promise<LeavePolicy> {
    await this.findPolicyById(id, schoolId);
    const updated = await this.leaveRepo.updatePolicy(id, schoolId, { name: dto.name, description: dto.description });
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

  async provisionLeaveBalances(policyId: string, schoolId: string, staffIds: string[], academicYearId: string): Promise<LeaveBalance[]> {
    const types = await this.leaveRepo.findTypesByPolicy(policyId, schoolId);
    const balances: LeaveBalance[] = [];
    for (const staffId of staffIds) {
      for (const lt of types) {
        balances.push(await this.leaveRepo.createBalance({ id: generateId(), school_id: schoolId, staff_id: staffId, leave_type_id: lt.id, allocated: lt.max_days, academic_year_id: academicYearId }));
      }
    }
    return balances;
  }

  // Teacher Leave
  async applyTeacherLeave(dto: ApplyTeacherLeaveDto, schoolId: string, staffId: string): Promise<TeacherLeaveRequest> {
    const from = new Date(dto.from_date);
    const to = new Date(dto.to_date);
    const totalDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return this.leaveRepo.createTeacherRequest({ id: generateId(), school_id: schoolId, staff_id: staffId, leave_type_id: dto.leave_type_id, from_date: dto.from_date, to_date: dto.to_date, total_days: totalDays, reason: dto.reason });
  }

  async getMyTeacherRequests(schoolId: string, staffId: string): Promise<TeacherLeaveRequest[]> {
    return this.leaveRepo.findTeacherRequests(schoolId, staffId);
  }

  async getMyTeacherSummary(schoolId: string, staffId: string, academicYearId: string): Promise<LeaveBalance[]> {
    return this.leaveRepo.findBalancesByStaff(staffId, schoolId, academicYearId);
  }

  async getAllTeacherRequests(schoolId: string): Promise<TeacherLeaveRequest[]> {
    return this.leaveRepo.findTeacherRequests(schoolId);
  }

  async getStaffSummary(schoolId: string, academicYearId: string): Promise<LeaveBalance[]> {
    return this.leaveRepo.findAllBalances(schoolId, academicYearId);
  }

  async reviewTeacherLeave(requestId: string, schoolId: string, reviewerId: string, dto: ReviewLeaveDto): Promise<TeacherLeaveRequest> {
    const req = await this.leaveRepo.findTeacherRequestById(requestId, schoolId);
    if (!req) throw new NotFoundException(`Leave request with id '${requestId}' not found`);
    return this.leaveRepo.reviewTeacherRequest(requestId, schoolId, { status: dto.status, reviewed_by: reviewerId, reviewer_remarks: dto.reviewer_remarks });
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

  async reviewStudentLeave(requestId: string, schoolId: string, reviewerId: string, dto: ReviewLeaveDto): Promise<StudentLeaveRequest> {
    const req = await this.leaveRepo.findStudentRequestById(requestId, schoolId);
    if (!req) throw new NotFoundException(`Leave request with id '${requestId}' not found`);
    return this.leaveRepo.reviewStudentRequest(requestId, schoolId, { status: dto.status, reviewed_by: reviewerId, reviewer_remarks: dto.reviewer_remarks });
  }

  async getStudentRequestById(requestId: string, schoolId: string): Promise<StudentLeaveRequest> {
    const req = await this.leaveRepo.findStudentRequestById(requestId, schoolId);
    if (!req) throw new NotFoundException(`Leave request with id '${requestId}' not found`);
    return req;
  }

  // Parent Leave
  async applyStudentLeave(dto: ApplyStudentLeaveDto, schoolId: string, appliedBy: string): Promise<StudentLeaveRequest> {
    const from = new Date(dto.from_date);
    const to = new Date(dto.to_date);
    const totalDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return this.leaveRepo.createStudentRequest({ id: generateId(), school_id: schoolId, student_id: dto.student_id, applied_by: appliedBy, from_date: dto.from_date, to_date: dto.to_date, total_days: totalDays, reason: dto.reason });
  }

  async getParentRequests(schoolId: string, appliedBy: string): Promise<StudentLeaveRequest[]> {
    return this.leaveRepo.findStudentRequests(schoolId, undefined, appliedBy);
  }

  async getStudentLeaveBalanceSummary(studentId: string, schoolId: string): Promise<{ total_days_requested: number; approved: number; pending: number }> {
    const requests = await this.leaveRepo.findStudentRequests(schoolId, studentId);
    return {
      total_days_requested: requests.reduce((s, r) => s + r.total_days, 0),
      approved: requests.filter((r) => r.status === 'APPROVED').reduce((s, r) => s + r.total_days, 0),
      pending: requests.filter((r) => r.status === 'PENDING').reduce((s, r) => s + r.total_days, 0),
    };
  }
}
