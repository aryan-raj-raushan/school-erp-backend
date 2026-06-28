import { pgTable, pgEnum, varchar, date, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { students } from './students.schema';
import { schoolUsers } from './school-users.schema';

export const earlyExitReasonEnum = pgEnum('early_exit_reason', [
  'MEDICAL',
  'PARENT_PICKUP',
  'EMERGENCY',
  'OFFICIAL',
  'OTHER',
]);

export const earlyExitStatusEnum = pgEnum('early_exit_status', [
  'PENDING',
  'APPROVED',
  'REJECTED',
]);

export const earlyExits = pgTable('early_exits', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  student_id: varchar('student_id', { length: 36 })
    .notNull()
    .references(() => students.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  exit_time: varchar('exit_time', { length: 8 }).notNull(),
  reason: earlyExitReasonEnum('reason').notNull(),
  remarks: text('remarks'),
  gate_pass_id: varchar('gate_pass_id', { length: 36 }),
  approved_by: varchar('approved_by', { length: 36 }).references(() => schoolUsers.id),
  approved_at: timestamp('approved_at', { withTimezone: true }),
  status: earlyExitStatusEnum('status').default('PENDING').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  created_by: varchar('created_by', { length: 36 }),
  deleted: boolean('deleted').default(false).notNull(),
});
