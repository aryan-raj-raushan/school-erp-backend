import { pgTable, varchar, timestamp, pgEnum, date } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { students } from './students.schema';

export const punchStatusEnum = pgEnum('punch_status', ['COMPLETE', 'MISSING_EXIT']);

export const rfidPunchLog = pgTable('rfid_punch_log', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  student_id: varchar('student_id', { length: 36 })
    .notNull()
    .references(() => students.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  entry_tap: timestamp('entry_tap', { withTimezone: true }).notNull(),
  exit_tap: timestamp('exit_tap', { withTimezone: true }),
  status: punchStatusEnum('status').default('MISSING_EXIT').notNull(),
});
