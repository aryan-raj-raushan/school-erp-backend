import { Injectable, Inject } from '@nestjs/common';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import {
  leaveTypes,
  leaveAssigned,
  leaveApplications,
} from '../../database/drizzle/schema/employee-leave.schema';
import {
  LeaveType,
  NewLeaveType,
  LeaveAssigned,
  NewLeaveAssigned,
  LeaveApplication,
  NewLeaveApplication,
} from './types/employee-leave.types';
import { FilterLeaveTypeDto } from './dto/leave-type.dto';
import { FilterAssignedLeaveDto } from './dto/leave-assigned.dto';
import { FilterLeaveApplicationDto } from './dto/leave-application.dto';

@Injectable()
export class EmployeeLeaveRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  // ═══════════════════════════════════════════════════════════
  // LEAVE TYPE
  // ═══════════════════════════════════════════════════════════

  private buildLeaveTypeConditions(schoolId: string, filters: FilterLeaveTypeDto) {
    const conditions = [eq(leaveTypes.school_id, schoolId), eq(leaveTypes.deleted, false)];
    if (filters.leave_validity) {
      conditions.push(eq(leaveTypes.leave_validity, filters.leave_validity));
    }
    if (filters.leave_pay_type) {
      conditions.push(eq(leaveTypes.leave_pay_type, filters.leave_pay_type));
    }
    // Only filter by is_enabled when explicitly passed
    if (filters.is_enabled !== undefined) {
      conditions.push(eq(leaveTypes.is_enabled, filters.is_enabled));
    }
    return conditions;
  }

  async findAllLeaveTypes(schoolId: string, filters: FilterLeaveTypeDto): Promise<LeaveType[]> {
    const conditions = this.buildLeaveTypeConditions(schoolId, filters);
    const limit = filters.limit ?? 20;
    const offset = ((filters.page ?? 1) - 1) * limit;

    return this.db
      .select()
      .from(leaveTypes)
      .where(and(...conditions))
      .orderBy(leaveTypes.created_at)
      .limit(limit)
      .offset(offset);
  }

  async countLeaveTypes(schoolId: string, filters: FilterLeaveTypeDto): Promise<number> {
    const conditions = this.buildLeaveTypeConditions(schoolId, filters);
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(leaveTypes)
      .where(and(...conditions));
    return Number(count);
  }

  async findLeaveTypeById(id: string, schoolId: string): Promise<LeaveType | undefined> {
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

  async softDeleteLeaveType(id: string, schoolId: string): Promise<void> {
    await this.db
      .update(leaveTypes)
      .set({ deleted: true, is_enabled: false, updated_at: new Date() })
      .where(and(eq(leaveTypes.id, id), eq(leaveTypes.school_id, schoolId)));
  }

  // ═══════════════════════════════════════════════════════════
  // LEAVE ASSIGNED
  // ═══════════════════════════════════════════════════════════

  async findAssignedLeavesByEmployee(
    employeeId: string,
    schoolId: string,
    filters: FilterAssignedLeaveDto,
  ): Promise<LeaveAssigned[]> {
    const conditions = [
      eq(leaveAssigned.employee_id, employeeId),
      eq(leaveAssigned.school_id, schoolId),
      eq(leaveAssigned.deleted, false),
    ];
    if (filters.academic_year_id) {
      conditions.push(eq(leaveAssigned.academic_year_id, filters.academic_year_id));
    }

    const limit = filters.limit ?? 50;
    const offset = ((filters.page ?? 1) - 1) * limit;

    return this.db
      .select()
      .from(leaveAssigned)
      .where(and(...conditions))
      .orderBy(leaveAssigned.created_at)
      .limit(limit)
      .offset(offset);
  }

  async countAssignedLeaves(
    employeeId: string,
    schoolId: string,
    filters: FilterAssignedLeaveDto,
  ): Promise<number> {
    const conditions = [
      eq(leaveAssigned.employee_id, employeeId),
      eq(leaveAssigned.school_id, schoolId),
      eq(leaveAssigned.deleted, false),
    ];
    if (filters.academic_year_id) {
      conditions.push(eq(leaveAssigned.academic_year_id, filters.academic_year_id));
    }
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(leaveAssigned)
      .where(and(...conditions));
    return Number(count);
  }

  /** Check if a specific leave type is already assigned to this employee for this academic year */
  async findAssignment(
    employeeId: string,
    schoolId: string,
    leaveTypeId: string,
    academicYearId: string,
  ): Promise<LeaveAssigned | undefined> {
    const [row] = await this.db
      .select()
      .from(leaveAssigned)
      .where(
        and(
          eq(leaveAssigned.employee_id, employeeId),
          eq(leaveAssigned.school_id, schoolId),
          eq(leaveAssigned.leave_type_id, leaveTypeId),
          eq(leaveAssigned.academic_year_id, academicYearId),
          eq(leaveAssigned.deleted, false),
        ),
      );
    return row;
  }

  async createAssignment(data: NewLeaveAssigned): Promise<LeaveAssigned> {
    const [row] = await this.db.insert(leaveAssigned).values(data).returning();
    return row;
  }

  async removeAssignment(id: string, schoolId: string): Promise<void> {
    await this.db
      .update(leaveAssigned)
      .set({ deleted: true, updated_at: new Date() })
      .where(and(eq(leaveAssigned.id, id), eq(leaveAssigned.school_id, schoolId)));
  }

  /** Increment used_days on an assignment row after a leave is approved */
  async incrementUsedDays(
    employeeId: string,
    schoolId: string,
    leaveTypeId: string,
    academicYearId: string,
    days: number,
  ): Promise<void> {
    await this.db
      .update(leaveAssigned)
      .set({
        used_days: sql`${leaveAssigned.used_days} + ${days}`,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(leaveAssigned.employee_id, employeeId),
          eq(leaveAssigned.school_id, schoolId),
          eq(leaveAssigned.leave_type_id, leaveTypeId),
          eq(leaveAssigned.academic_year_id, academicYearId),
        ),
      );
  }

  // ═══════════════════════════════════════════════════════════
  // LEAVE APPLICATIONS
  // ═══════════════════════════════════════════════════════════

  private buildApplicationConditions(schoolId: string, filters: FilterLeaveApplicationDto) {
    const conditions = [
      eq(leaveApplications.school_id, schoolId),
      eq(leaveApplications.deleted, false),
    ];

    if (filters.employee_id) {
      conditions.push(eq(leaveApplications.employee_id, filters.employee_id));
    }
    if (filters.academic_year_id) {
      conditions.push(eq(leaveApplications.academic_year_id, filters.academic_year_id));
    }
    if (filters.leave_type_id) {
      conditions.push(eq(leaveApplications.leave_type_id, filters.leave_type_id));
    }
    if (filters.status) {
      conditions.push(eq(leaveApplications.status, filters.status));
    }
    if (filters.from_date) {
      conditions.push(gte(leaveApplications.start_date, filters.from_date));
    }
    if (filters.to_date) {
      conditions.push(lte(leaveApplications.end_date, filters.to_date));
    }

    return conditions;
  }

  async findAllApplications(
    schoolId: string,
    filters: FilterLeaveApplicationDto,
  ): Promise<LeaveApplication[]> {
    const conditions = this.buildApplicationConditions(schoolId, filters);
    const limit = filters.limit ?? 20;
    const offset = ((filters.page ?? 1) - 1) * limit;

    return this.db
      .select()
      .from(leaveApplications)
      .where(and(...conditions))
      .orderBy(leaveApplications.created_at)
      .limit(limit)
      .offset(offset);
  }

  async countApplications(schoolId: string, filters: FilterLeaveApplicationDto): Promise<number> {
    const conditions = this.buildApplicationConditions(schoolId, filters);
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(leaveApplications)
      .where(and(...conditions));
    return Number(count);
  }

  async findApplicationById(id: string, schoolId: string): Promise<LeaveApplication | undefined> {
    const [row] = await this.db
      .select()
      .from(leaveApplications)
      .where(
        and(
          eq(leaveApplications.id, id),
          eq(leaveApplications.school_id, schoolId),
          eq(leaveApplications.deleted, false),
        ),
      );
    return row;
  }

  async createApplication(data: NewLeaveApplication): Promise<LeaveApplication> {
    const [row] = await this.db.insert(leaveApplications).values(data).returning();
    return row;
  }

  async updateApplication(
    id: string,
    schoolId: string,
    data: Partial<NewLeaveApplication>,
  ): Promise<LeaveApplication> {
    const [row] = await this.db
      .update(leaveApplications)
      .set({ ...data, updated_at: new Date() })
      .where(and(eq(leaveApplications.id, id), eq(leaveApplications.school_id, schoolId)))
      .returning();
    return row;
  }

  async softDeleteApplication(id: string, schoolId: string): Promise<void> {
    await this.db
      .update(leaveApplications)
      .set({ deleted: true, updated_at: new Date() })
      .where(and(eq(leaveApplications.id, id), eq(leaveApplications.school_id, schoolId)));
  }
}
