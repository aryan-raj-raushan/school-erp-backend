import { pgTable, pgEnum, varchar, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { teacherLeaveRequests, studentLeaveRequests } from './leave.schema';
import { schoolUsers } from './school-users.schema';

export const approverRoleEnum = pgEnum('approver_role', [
  'HOD',
  'PRINCIPAL',
  'HR',
  'CLASS_TEACHER',
  'ADMIN',
]);

export const approvalStepStatusEnum = pgEnum('approval_step_status', [
  'PENDING',
  'APPROVED',
  'REJECTED',
]);

export const leaveApprovalWorkflow = pgTable('leave_approval_workflow', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const leaveWorkflowStepTemplates = pgTable('leave_workflow_step_templates', {
  id: varchar('id', { length: 36 }).primaryKey(),
  workflow_id: varchar('workflow_id', { length: 36 })
    .notNull()
    .references(() => leaveApprovalWorkflow.id, { onDelete: 'cascade' }),
  step_order: integer('step_order').notNull(),
  approver_role: approverRoleEnum('approver_role').notNull(),
  approver_id: varchar('approver_id', { length: 36 }).references(() => schoolUsers.id),
});

export const leaveApprovalSteps = pgTable('leave_approval_steps', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 }).notNull(),
  leave_request_id: varchar('leave_request_id', { length: 36 }).notNull(),
  leave_type: varchar('leave_type', { length: 20 }).notNull().default('TEACHER'),
  step_order: integer('step_order').notNull(),
  approver_id: varchar('approver_id', { length: 36 }).references(() => schoolUsers.id),
  approver_role: approverRoleEnum('approver_role').notNull(),
  status: approvalStepStatusEnum('status').default('PENDING').notNull(),
  remarks: varchar('remarks', { length: 500 }),
  decided_at: timestamp('decided_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
