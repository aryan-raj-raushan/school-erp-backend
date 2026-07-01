import { Injectable, Inject } from '@nestjs/common';
import { eq, and, lte, gte } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { schoolEvents } from '../../database/drizzle/schema/school-events.schema';
import {
  teacherLeaveRequests,
  studentLeaveRequests,
} from '../../database/drizzle/schema/leave.schema';
import { leaveApplications } from '../../database/drizzle/schema/employee-leave.schema';
import { SchoolSettingsService } from '../school-settings/school-settings.service';
import { StaffShiftsService } from '../staff-shifts/staff-shifts.service';
import type { SchoolTiming } from '../school-settings/types/school-settings.types';

export type AttendanceSource = 'MANUAL' | 'RFID' | 'BIOMETRIC' | 'QR';
export type PersonType = 'STUDENT' | 'TEACHER' | 'STAFF';

export type ResolvedStatus =
  | 'PRESENT'
  | 'ABSENT'
  | 'LATE'
  | 'HALF_DAY'
  | 'HOLIDAY'
  | 'LEAVE'
  | 'MISSING_PUNCH'
  | 'EARLY_EXIT'
  | 'SKIP';

export interface AttendanceContext {
  schoolId: string;
  personId: string;
  personType: PersonType;
  date: string;
  tapTime?: string;
  source: AttendanceSource;
  manualStatus?: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY';
  classSectionId?: string;
}

export interface EngineResult {
  status: ResolvedStatus;
  isLate: boolean;
  timing: SchoolTiming | null;
  reason: string;
  conflictDetected: boolean;
}

@Injectable()
export class AttendanceEngineService {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: DrizzleDB,
    private readonly settingsService: SchoolSettingsService,
    private readonly staffShiftsService: StaffShiftsService,
  ) {}

  async resolve(ctx: AttendanceContext): Promise<EngineResult> {
    // Step 1 — Holiday check
    const isHoliday = await this.isHoliday(ctx.schoolId, ctx.date);
    if (isHoliday) {
      return {
        status: 'HOLIDAY',
        isLate: false,
        timing: null,
        reason: 'Holiday',
        conflictDetected: false,
      };
    }

    // Step 2 — Approved leave check
    const hasApprovedLeave = await this.hasApprovedLeave(
      ctx.schoolId,
      ctx.personId,
      ctx.personType,
      ctx.date,
    );
    if (hasApprovedLeave) {
      return {
        status: 'LEAVE',
        isLate: false,
        timing: null,
        reason: 'Approved leave',
        conflictDetected: false,
      };
    }

    // Step 3 — Manual source: trust the provided status, still use timing for is_late
    if (ctx.source === 'MANUAL' && ctx.manualStatus !== undefined) {
      const timing = await this.resolveActiveTiming(ctx);
      const isLate = ctx.manualStatus === 'LATE' || ctx.manualStatus === 'HALF_DAY';
      return {
        status: ctx.manualStatus,
        isLate,
        timing,
        reason: 'Manual mark',
        conflictDetected: false,
      };
    }

    // Step 4 — Resolve timing schedule
    const timing = await this.resolveActiveTiming(ctx);

    // Step 5 — No tap time (RFID/biometric without time) → PRESENT, not late
    if (!ctx.tapTime) {
      return {
        status: 'PRESENT',
        isLate: false,
        timing,
        reason: 'No tap time — defaulting to PRESENT',
        conflictDetected: false,
      };
    }

    // Step 6 — Compute status from tap time
    if (!timing) {
      return {
        status: 'PRESENT',
        isLate: false,
        timing: null,
        reason: 'No active timing schedule',
        conflictDetected: false,
      };
    }

    const result = this.computeStatusFromTime(ctx.tapTime, timing);
    return { ...result, timing, conflictDetected: false };
  }

  private computeStatusFromTime(
    tapTime: string,
    timing: SchoolTiming,
  ): Pick<EngineResult, 'status' | 'isLate' | 'reason'> {
    const tap = this.timeToMinutes(tapTime);
    const start = this.timeToMinutes(timing.school_start_time);
    const grace = timing.grace_period_minutes ?? 10;

    const lateAfter = timing.late_cutoff_time
      ? this.timeToMinutes(timing.late_cutoff_time)
      : start + grace;

    const halfDayAfter = timing.half_day_cutoff_time
      ? this.timeToMinutes(timing.half_day_cutoff_time)
      : null;

    const absentAfter = timing.absent_cutoff_time
      ? this.timeToMinutes(timing.absent_cutoff_time)
      : null;

    if (absentAfter !== null && tap > absentAfter) {
      return {
        status: 'ABSENT',
        isLate: false,
        reason: `Arrived after absent cutoff (${timing.absent_cutoff_time})`,
      };
    }

    if (halfDayAfter !== null && tap > halfDayAfter) {
      return {
        status: 'HALF_DAY',
        isLate: true,
        reason: `Arrived after half-day cutoff (${timing.half_day_cutoff_time})`,
      };
    }

    if (tap > lateAfter) {
      return {
        status: 'LATE',
        isLate: true,
        reason: `Arrived after late cutoff (${timing.late_cutoff_time ?? `${timing.school_start_time}+${grace}min`})`,
      };
    }

    return { status: 'PRESENT', isLate: false, reason: 'On time' };
  }

  private async resolveActiveTiming(ctx: AttendanceContext): Promise<SchoolTiming | null> {
    if (ctx.personType === 'STAFF') {
      const shift = await this.staffShiftsService.getActiveShift(
        ctx.personId,
        ctx.schoolId,
        ctx.date,
      );
      if (shift) {
        return {
          id: `shift:${shift.id}`,
          school_id: ctx.schoolId,
          name: shift.shift_name,
          timing_type: 'DEFAULT' as const,
          school_start_time: shift.shift_start,
          school_end_time: shift.shift_end,
          grace_period_minutes: Number(shift.grace_period_minutes ?? 10),
          late_cutoff_time: null,
          half_day_cutoff_time: null,
          absent_cutoff_time: null,
          working_days: shift.working_days ?? 'MON,TUE,WED,THU,FRI',
          period_duration_minutes: 45,
          lunch_start_time: null,
          lunch_end_time: null,
          effective_from: shift.effective_from,
          effective_to: shift.effective_to,
          priority: 10,
          is_active: true,
          deleted: false,
          created_at: shift.created_at,
          updated_at: shift.updated_at ?? shift.created_at,
        };
      }
    }

    return this.settingsService.getActiveTimingForDate(ctx.schoolId, ctx.date);
  }

  private async isHoliday(schoolId: string, date: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: schoolEvents.id })
      .from(schoolEvents)
      .where(
        and(
          eq(schoolEvents.school_id, schoolId),
          eq(schoolEvents.type, 'HOLIDAY'),
          eq(schoolEvents.is_active, true),
          eq(schoolEvents.deleted, false),
          lte(schoolEvents.from_date, date),
          gte(schoolEvents.to_date, date),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  private async hasApprovedLeave(
    schoolId: string,
    personId: string,
    personType: PersonType,
    date: string,
  ): Promise<boolean> {
    if (personType === 'TEACHER') {
      const rows = await this.db
        .select({ id: teacherLeaveRequests.id })
        .from(teacherLeaveRequests)
        .where(
          and(
            eq(teacherLeaveRequests.school_id, schoolId),
            eq(teacherLeaveRequests.staff_id, personId),
            eq(teacherLeaveRequests.status, 'APPROVED'),
            lte(teacherLeaveRequests.from_date, date),
            gte(teacherLeaveRequests.to_date, date),
          ),
        )
        .limit(1);
      return rows.length > 0;
    }

    if (personType === 'STUDENT') {
      const rows = await this.db
        .select({ id: studentLeaveRequests.id })
        .from(studentLeaveRequests)
        .where(
          and(
            eq(studentLeaveRequests.school_id, schoolId),
            eq(studentLeaveRequests.student_id, personId),
            eq(studentLeaveRequests.status, 'APPROVED'),
            lte(studentLeaveRequests.from_date, date),
            gte(studentLeaveRequests.to_date, date),
          ),
        )
        .limit(1);
      return rows.length > 0;
    }

    if (personType === 'STAFF') {
      const rows = await this.db
        .select({ id: leaveApplications.id })
        .from(leaveApplications)
        .where(
          and(
            eq(leaveApplications.school_id, schoolId),
            eq(leaveApplications.employee_id, personId),
            eq(leaveApplications.status, 'APPROVED'),
            lte(leaveApplications.start_date, date),
            gte(leaveApplications.end_date, date),
          ),
        )
        .limit(1);
      return rows.length > 0;
    }

    return false;
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }
}
