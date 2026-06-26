import { pgTable, uuid, varchar, integer, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const leaveValidityEnum = pgEnum('leave_validity', ['MONTHLY', 'YEARLY', 'ON_OCCASION']);
export const leavePayTypeEnum = pgEnum('leave_pay_type', ['PAID', 'UNPAID']);
export const leaveApplicationStatusEnum = pgEnum('leave_application_status', [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
]);

// ─── Leave Type ───────────────────────────────────────────────────────────────
export const leaveTypes = pgTable('leave_types', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 }).notNull(),
  leave_name: varchar('leave_name', { length: 100 }).notNull(),
  leave_validity: leaveValidityEnum('leave_validity').notNull(),
  leave_pay_type: leavePayTypeEnum('leave_pay_type').notNull(),
  leave_count_days: integer('leave_count_days').notNull(),
  is_enabled: boolean('is_enabled').notNull().default(true),
  deleted: boolean('deleted').notNull().default(false),
  created_by: uuid('created_by').notNull(),
  updated_at: timestamp('updated_at').defaultNow(),
  created_at: timestamp('created_at').defaultNow(),
});

// ─── Leave Assigned ───────────────────────────────────────────────────────────
// Maps which leave types are assigned to which employees for a given academic year
export const leaveAssigned = pgTable('leave_assigned', {
  id: uuid('id').primaryKey(),
  school_id: uuid('school_id').notNull(),
  academic_year_id: uuid('academic_year_id').notNull(),
  employee_id: uuid('employee_id').notNull(),
  leave_type_id: varchar('leave_type_id', { length: 36 }).notNull(),
  // Tracks used/remaining days (derived, kept for quick reads)
  used_days: integer('used_days').notNull().default(0),
  deleted: boolean('deleted').notNull().default(false),
  created_by: uuid('created_by').notNull(),
  updated_at: timestamp('updated_at').defaultNow(),
  created_at: timestamp('created_at').defaultNow(),
});

// ─── Leave Applications ────────────────────────────────────────────────────────
export const leaveApplications = pgTable('leave_applications', {
  id: uuid('id').primaryKey(),
  school_id: uuid('school_id').notNull(),
  academic_year_id: uuid('academic_year_id').notNull(),
  employee_id: uuid('employee_id').notNull(),
  leave_type_id: varchar('leave_type_id', { length: 36 }).notNull(),
  start_date: varchar('start_date', { length: 20 }).notNull(), // stored as ISO string YYYY-MM-DD
  end_date: varchar('end_date', { length: 20 }).notNull(),
  total_days: integer('total_days').notNull(),
  reason: varchar('reason', { length: 500 }),
  status: leaveApplicationStatusEnum('status').notNull().default('PENDING'),
  // Approval fields
  reviewed_by: uuid('reviewed_by'),
  reviewed_at: timestamp('reviewed_at'),
  remarks: varchar('remarks', { length: 500 }),
  deleted: boolean('deleted').notNull().default(false),
  created_by: uuid('created_by').notNull(),
  updated_at: timestamp('updated_at').defaultNow(),
  created_at: timestamp('created_at').defaultNow(),
});
