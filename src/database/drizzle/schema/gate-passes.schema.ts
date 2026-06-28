import { pgTable, pgEnum, varchar, date, timestamp, boolean, text } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { students } from './students.schema';
import { schoolUsers } from './school-users.schema';

export const gatePassStatusEnum = pgEnum('gate_pass_status', [
  'PENDING',
  'APPROVED',
  'USED',
  'EXPIRED',
  'REJECTED',
]);

export const gatePasses = pgTable('gate_passes', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  student_id: varchar('student_id', { length: 36 })
    .notNull()
    .references(() => students.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  reason: text('reason').notNull(),
  exit_time: varchar('exit_time', { length: 8 }),
  return_time: varchar('return_time', { length: 8 }),
  qr_code: varchar('qr_code', { length: 36 }).unique(),
  status: gatePassStatusEnum('status').default('PENDING').notNull(),
  approved_by: varchar('approved_by', { length: 36 }).references(() => schoolUsers.id),
  approved_at: timestamp('approved_at', { withTimezone: true }),
  used_at: timestamp('used_at', { withTimezone: true }),
  parent_consent_required: boolean('parent_consent_required').default(false).notNull(),
  parent_approved_at: timestamp('parent_approved_at', { withTimezone: true }),
  created_by: varchar('created_by', { length: 36 }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  deleted: boolean('deleted').default(false).notNull(),
});
