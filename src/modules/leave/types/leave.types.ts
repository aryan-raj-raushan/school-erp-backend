import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import {
  leavePolicies,
  leaveTypesEmployee as leaveTypes,
  leaveBalances,
  teacherLeaveRequests,
  studentLeaveRequests,
} from '../../../database/drizzle/schema/leave.schema';

export type LeavePolicy = InferSelectModel<typeof leavePolicies>;
export type NewLeavePolicy = InferInsertModel<typeof leavePolicies>;

export type LeaveType = InferSelectModel<typeof leaveTypes>;
export type NewLeaveType = InferInsertModel<typeof leaveTypes>;

export type LeaveBalance = InferSelectModel<typeof leaveBalances>;
export type NewLeaveBalance = InferInsertModel<typeof leaveBalances>;

export type TeacherLeaveRequest = InferSelectModel<typeof teacherLeaveRequests>;
export type NewTeacherLeaveRequest = InferInsertModel<typeof teacherLeaveRequests>;

export type StudentLeaveRequest = InferSelectModel<typeof studentLeaveRequests>;
export type NewStudentLeaveRequest = InferInsertModel<typeof studentLeaveRequests>;
