import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EmployeeLeaveRepository } from './employee-leave.repository';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { PaginationResponse } from '../../shared/responses/api-response';
import { REDIS_EMPLOYEE_LEAVE_KEY } from '@shared/redis/redis-key';
import { LeaveApplicationStatus } from './leave.enum';

import { CreateLeaveTypeDto, UpdateLeaveTypeDto, FilterLeaveTypeDto } from './dto/leave-type.dto';
import { AssignLeaveDto, FilterAssignedLeaveDto } from './dto/leave-assigned.dto';
import {
  ApplyLeaveDto,
  ReviewLeaveDto,
  FilterLeaveApplicationDto,
} from './dto/leave-application.dto';

import {
  LeaveType,
  LeaveAssigned,
  EmployeeLeaveView,
  LeaveApplication,
} from './types/employee-leave.types';

@Injectable()
export class EmployeeLeaveService {
  constructor(
    private readonly leaveRepo: EmployeeLeaveRepository,
    private readonly redisService: RedisService,
  ) {}

  // ─── Cache key helpers ────────────────────────────────────────────────────
  private leaveTypeKey(schoolId: string) {
    return REDIS_EMPLOYEE_LEAVE_KEY.LEAVE_TYPE(schoolId);
  }
  private assignedKey(schoolId: string) {
    return REDIS_EMPLOYEE_LEAVE_KEY.LEAVE_ASSIGNED(schoolId);
  }
  private applicationKey(schoolId: string) {
    return REDIS_EMPLOYEE_LEAVE_KEY.LEAVE_APPLICATION(schoolId);
  }

  // ═══════════════════════════════════════════════════════════
  // LEAVE TYPE
  // ═══════════════════════════════════════════════════════════

  async findAllLeaveTypes(
    schoolId: string,
    filters: FilterLeaveTypeDto,
  ): Promise<PaginationResponse<LeaveType>> {
    const key = `${this.leaveTypeKey(schoolId)}:list:${JSON.stringify(filters)}`;
    return this.redisService.getOrSet(key, REDIS_EMPLOYEE_LEAVE_KEY.LIST_TTL, async () => {
      const [items, total] = await Promise.all([
        this.leaveRepo.findAllLeaveTypes(schoolId, filters),
        this.leaveRepo.countLeaveTypes(schoolId, filters),
      ]);
      return PaginationResponse.of(items, total, filters);
    });
  }

  async findLeaveTypeById(id: string, schoolId: string): Promise<LeaveType> {
    const key = `${this.leaveTypeKey(schoolId)}:${id}`;
    return this.redisService.getOrSet(key, REDIS_EMPLOYEE_LEAVE_KEY.ITEM_TTL, async () => {
      const leaveType = await this.leaveRepo.findLeaveTypeById(id, schoolId);
      if (!leaveType) {
        throw new NotFoundException(`Leave type with id '${id}' not found`);
      }
      return leaveType;
    });
  }

  async createLeaveType(
    dto: CreateLeaveTypeDto,
    schoolId: string,
    createdBy: string,
  ): Promise<LeaveType> {
    const leaveType = await this.leaveRepo.createLeaveType({
      id: generateId(),
      school_id: schoolId,
      created_by: createdBy,
      is_enabled: dto.is_enabled ?? true,
      ...dto,
    });
    await this.redisService.delByPattern(`${this.leaveTypeKey(schoolId)}:list:*`);
    return leaveType;
  }

  async updateLeaveType(
    id: string,
    schoolId: string,
    dto: UpdateLeaveTypeDto,
    // updatedBy: string,
  ): Promise<LeaveType> {
    await this.findLeaveTypeById(id, schoolId);
    const updated = await this.leaveRepo.updateLeaveType(id, schoolId, dto);
    await this.redisService.delByPattern(`${this.leaveTypeKey(schoolId)}:*`);
    return updated;
  }

  async removeLeaveType(id: string, schoolId: string): Promise<void> {
    await this.findLeaveTypeById(id, schoolId);
    await this.leaveRepo.softDeleteLeaveType(id, schoolId);
    await this.redisService.delByPattern(`${this.leaveTypeKey(schoolId)}:*`);
  }

  // ═══════════════════════════════════════════════════════════
  // LEAVE ASSIGNED
  // ═══════════════════════════════════════════════════════════

  /**
   * Returns all leave types assigned to an employee, enriched with
   * leave type details and remaining days calculation.
   */
  async findAssignedLeaves(
    employeeId: string,
    schoolId: string,
    filters: FilterAssignedLeaveDto,
  ): Promise<PaginationResponse<EmployeeLeaveView>> {
    const key = `${this.assignedKey(schoolId)}:${employeeId}:${JSON.stringify(filters)}`;
    return this.redisService.getOrSet(key, REDIS_EMPLOYEE_LEAVE_KEY.ASSIGNED_TTL, async () => {
      const [assignments, total] = await Promise.all([
        this.leaveRepo.findAssignedLeavesByEmployee(employeeId, schoolId, filters),
        this.leaveRepo.countAssignedLeaves(employeeId, schoolId, filters),
      ]);

      // Enrich each assignment with its leave type details
      const items: EmployeeLeaveView[] = await Promise.all(
        assignments.map(async (assignment) => {
          const leaveType = await this.leaveRepo.findLeaveTypeById(
            assignment.leave_type_id,
            schoolId,
          );
          return {
            ...assignment,
            leave_type: leaveType!,
            remaining_days: (leaveType?.leave_count_days ?? 0) - assignment.used_days,
          };
        }),
      );

      return PaginationResponse.of(items, total, filters);
    });
  }

  async assignLeave(
    dto: AssignLeaveDto,
    schoolId: string,
    createdBy: string,
  ): Promise<LeaveAssigned> {
    // Verify the leave type exists and is enabled
    const leaveType = await this.findLeaveTypeById(dto.leave_type_id, schoolId);
    if (!leaveType.is_enabled) {
      throw new BadRequestException(
        `Leave type '${leaveType.leave_name}' is currently disabled and cannot be assigned`,
      );
    }

    // Prevent duplicate assignment for same employee + leave type + academic year
    const existing = await this.leaveRepo.findAssignment(
      dto.employee_id,
      schoolId,
      dto.leave_type_id,
      dto.academic_year_id,
    );
    if (existing) {
      throw new ConflictException(
        `Leave type '${leaveType.leave_name}' is already assigned to this employee for the selected academic year`,
      );
    }

    const assignment = await this.leaveRepo.createAssignment({
      id: generateId(),
      school_id: schoolId,
      employee_id: dto.employee_id,
      leave_type_id: dto.leave_type_id,
      academic_year_id: dto.academic_year_id,
      created_by: createdBy,
      used_days: 0,
    });

    await this.redisService.delByPattern(`${this.assignedKey(schoolId)}:${dto.employee_id}:*`);
    return assignment;
  }

  async revokeAssignedLeave(id: string, schoolId: string, employeeId: string): Promise<void> {
    await this.leaveRepo.removeAssignment(id, schoolId);
    await this.redisService.delByPattern(`${this.assignedKey(schoolId)}:${employeeId}:*`);
  }

  // ═══════════════════════════════════════════════════════════
  // LEAVE APPLICATIONS
  // ═══════════════════════════════════════════════════════════

  async findAllApplications(
    schoolId: string,
    filters: FilterLeaveApplicationDto,
  ): Promise<PaginationResponse<LeaveApplication>> {
    const key = `${this.applicationKey(schoolId)}:list:${JSON.stringify(filters)}`;
    return this.redisService.getOrSet(key, REDIS_EMPLOYEE_LEAVE_KEY.APPLICATION_TTL, async () => {
      const [items, total] = await Promise.all([
        this.leaveRepo.findAllApplications(schoolId, filters),
        this.leaveRepo.countApplications(schoolId, filters),
      ]);
      return PaginationResponse.of(items, total, filters);
    });
  }

  async findApplicationById(id: string, schoolId: string): Promise<LeaveApplication> {
    const key = `${this.applicationKey(schoolId)}:${id}`;
    return this.redisService.getOrSet(key, REDIS_EMPLOYEE_LEAVE_KEY.APPLICATION_TTL, async () => {
      const application = await this.leaveRepo.findApplicationById(id, schoolId);
      if (!application) {
        throw new NotFoundException(`Leave application with id '${id}' not found`);
      }
      return application;
    });
  }

  async applyLeave(
    dto: ApplyLeaveDto,
    schoolId: string,
    employeeId: string,
  ): Promise<LeaveApplication> {
    // 1. Verify the leave type is assigned to this employee for the academic year
    const assignment = await this.leaveRepo.findAssignment(
      employeeId,
      schoolId,
      dto.leave_type_id,
      dto.academic_year_id,
    );
    if (!assignment) {
      throw new BadRequestException(
        'This leave type is not assigned to you for the selected academic year',
      );
    }

    // 2. Calculate total days requested (inclusive)
    const start = new Date(dto.start_date);
    const end = new Date(dto.end_date);
    if (end < start) {
      throw new BadRequestException('end_date must be on or after start_date');
    }
    const totalDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // 3. Verify the leave type is enabled and check remaining balance
    const leaveType = await this.findLeaveTypeById(dto.leave_type_id, schoolId);
    if (!leaveType.is_enabled) {
      throw new BadRequestException(`Leave type '${leaveType.leave_name}' is currently disabled`);
    }

    const remaining = leaveType.leave_count_days - assignment.used_days;
    if (totalDays > remaining) {
      throw new BadRequestException(
        `Insufficient leave balance. Requested: ${totalDays} day(s), Available: ${remaining} day(s)`,
      );
    }

    const application = await this.leaveRepo.createApplication({
      id: generateId(),
      school_id: schoolId,
      academic_year_id: dto.academic_year_id,
      employee_id: employeeId,
      leave_type_id: dto.leave_type_id,
      start_date: dto.start_date,
      end_date: dto.end_date,
      total_days: totalDays,
      reason: dto.reason ?? null,
      status: 'PENDING',
      created_by: employeeId,
    });

    await this.redisService.delByPattern(`${this.applicationKey(schoolId)}:list:*`);
    return application;
  }

  async reviewLeave(
    id: string,
    schoolId: string,
    dto: ReviewLeaveDto,
    reviewedBy: string,
  ): Promise<LeaveApplication> {
    const application = await this.findApplicationById(id, schoolId);

    // Guard: only PENDING applications can be reviewed
    if (application.status !== 'PENDING') {
      throw new ForbiddenException(
        `Cannot review a leave application that is already '${application.status}'`,
      );
    }

    const updated = await this.leaveRepo.updateApplication(id, schoolId, {
      status: dto.status,
      remarks: dto.remarks ?? null,
      reviewed_by: reviewedBy,
      reviewed_at: new Date(),
    });

    // Side-effect: if approved, increment used_days on the assignment
    if (dto.status === LeaveApplicationStatus.APPROVED) {
      await this.leaveRepo.incrementUsedDays(
        application.employee_id,
        schoolId,
        application.leave_type_id,
        application.academic_year_id,
        application.total_days,
      );
      // Bust assigned leave cache for the employee
      await this.redisService.delByPattern(
        `${this.assignedKey(schoolId)}:${application.employee_id}:*`,
      );
    }

    // Bust application caches
    await this.redisService.delByPattern(`${this.applicationKey(schoolId)}:*`);

    return updated;
  }

  async cancelLeave(id: string, schoolId: string, employeeId: string): Promise<LeaveApplication> {
    const application = await this.findApplicationById(id, schoolId);

    // Only the applicant can cancel, and only when PENDING
    if (application.employee_id !== employeeId) {
      throw new ForbiddenException('You can only cancel your own leave applications');
    }
    if (application.status !== 'PENDING') {
      throw new ForbiddenException(
        `Cannot cancel a leave application that is already '${application.status}'`,
      );
    }

    const updated = await this.leaveRepo.updateApplication(id, schoolId, {
      status: 'CANCELLED',
    });

    await this.redisService.delByPattern(`${this.applicationKey(schoolId)}:*`);
    return updated;
  }
}
