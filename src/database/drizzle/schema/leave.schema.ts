import { pgTable, pgEnum, varchar, boolean, timestamp, date, integer, text, numeric } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { students } from './students.schema';

export const leaveRequestStatusEnum = pgEnum('leave_request_status', ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']);

export const leavePolicies = pgTable('leave_policies', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 }).notNull().references(() => schools.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 150 }).notNull(),
  description: text('description'),
  academic_year_id: varchar('academic_year_id', { length: 36 }).notNull(),
  is_active: boolean('is_active').default(true).notNull(),
  deleted: boolean('deleted').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
});

export const leaveTypes = pgTable('leave_types', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 }).notNull().references(() => schools.id, { onDelete: 'cascade' }),
  policy_id: varchar('policy_id', { length: 36 }).notNull().references(() => leavePolicies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  max_days: integer('max_days').notNull(),
  is_paid: boolean('is_paid').default(true).notNull(),
  description: text('description'),
  deleted: boolean('deleted').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
});

export const leaveBalances = pgTable('leave_balances', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 }).notNull().references(() => schools.id, { onDelete: 'cascade' }),
  staff_id: varchar('staff_id', { length: 36 }).notNull(),
  leave_type_id: varchar('leave_type_id', { length: 36 }).notNull().references(() => leaveTypes.id, { onDelete: 'cascade' }),
  allocated: integer('allocated').notNull(),
  used: integer('used').default(0).notNull(),
  academic_year_id: varchar('academic_year_id', { length: 36 }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
});

export const teacherLeaveRequests = pgTable('teacher_leave_requests', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 }).notNull().references(() => schools.id, { onDelete: 'cascade' }),
  staff_id: varchar('staff_id', { length: 36 }).notNull(),
  leave_type_id: varchar('leave_type_id', { length: 36 }).notNull().references(() => leaveTypes.id, { onDelete: 'cascade' }),
  from_date: date('from_date').notNull(),
  to_date: date('to_date').notNull(),
  total_days: integer('total_days').notNull(),
  reason: text('reason').notNull(),
  status: leaveRequestStatusEnum('status').default('PENDING').notNull(),
  reviewed_by: varchar('reviewed_by', { length: 36 }),
  reviewer_remarks: text('reviewer_remarks'),
  reviewed_at: timestamp('reviewed_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
});

export const studentLeaveRequests = pgTable('student_leave_requests', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 }).notNull().references(() => schools.id, { onDelete: 'cascade' }),
  student_id: varchar('student_id', { length: 36 }).notNull().references(() => students.id, { onDelete: 'cascade' }),
  applied_by: varchar('applied_by', { length: 36 }).notNull(),
  from_date: date('from_date').notNull(),
  to_date: date('to_date').notNull(),
  total_days: integer('total_days').notNull(),
  reason: text('reason').notNull(),
  status: leaveRequestStatusEnum('status').default('PENDING').notNull(),
  reviewed_by: varchar('reviewed_by', { length: 36 }),
  reviewer_remarks: text('reviewer_remarks'),
  reviewed_at: timestamp('reviewed_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
});
