import { leaveApplications, leaveAssigned, leaveTypes } from '@database/drizzle/schema';
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';

// ─── Leave Type ───────────────────────────────────────────────────────────────
export type LeaveType = InferSelectModel<typeof leaveTypes>;
export type NewLeaveType = InferInsertModel<typeof leaveTypes>;

// ─── Leave Assigned ───────────────────────────────────────────────────────────
export type LeaveAssigned = InferSelectModel<typeof leaveAssigned>;
export type NewLeaveAssigned = InferInsertModel<typeof leaveAssigned>;

// ─── Leave Application ────────────────────────────────────────────────────────
export type LeaveApplication = InferSelectModel<typeof leaveApplications>;
export type NewLeaveApplication = InferInsertModel<typeof leaveApplications>;

// ─── Extended / enriched view types ──────────────────────────────────────────
/** Returned when fetching an employee's assigned leaves — includes leave type details */
export type EmployeeLeaveView = LeaveAssigned & {
  leave_type: LeaveType;
  remaining_days: number;
};

/** Returned when listing/approving applications — includes employee + leave type details */
export type LeaveApplicationView = LeaveApplication & {
  leave_type: Pick<LeaveType, 'id' | 'leave_name' | 'leave_pay_type' | 'leave_validity'>;
};
