import { pgTable, pgEnum, varchar, date, timestamp, text } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { attendances } from './attendance.schema';

export const attendanceResolutionEnum = pgEnum('attendance_resolution', [
  'RFID_WON',
  'MANUAL_WON',
  'ADMIN_SET',
]);

export const attendanceConflicts = pgTable('attendance_conflicts', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  attendance_id: varchar('attendance_id', { length: 36 }).references(() => attendances.id, {
    onDelete: 'set null',
  }),
  student_id: varchar('student_id', { length: 36 }).notNull(),
  date: date('date').notNull(),
  rfid_status: varchar('rfid_status', { length: 32 }),
  rfid_tap_time: timestamp('rfid_tap_time', { withTimezone: true }),
  manual_status: varchar('manual_status', { length: 32 }),
  manual_marked_by: varchar('manual_marked_by', { length: 36 }),
  manual_marked_at: timestamp('manual_marked_at', { withTimezone: true }),
  resolved_by: varchar('resolved_by', { length: 36 }),
  resolved_at: timestamp('resolved_at', { withTimezone: true }),
  resolution: attendanceResolutionEnum('resolution'),
  notes: text('notes'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
