import { pgTable, varchar, timestamp, text } from 'drizzle-orm/pg-core';
import { attendances } from './attendance.schema';
import { schools } from './schools.schema';

export const attendanceAuditLog = pgTable('attendance_audit_log', {
  id: varchar('id', { length: 36 }).primaryKey(),
  attendance_id: varchar('attendance_id', { length: 36 })
    .notNull()
    .references(() => attendances.id, { onDelete: 'cascade' }),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  changed_by: varchar('changed_by', { length: 36 }).notNull(),
  changed_at: timestamp('changed_at', { withTimezone: true }).defaultNow().notNull(),
  old_status: varchar('old_status', { length: 32 }),
  new_status: varchar('new_status', { length: 32 }),
  old_remarks: text('old_remarks'),
  new_remarks: text('new_remarks'),
  reason: text('reason'),
  ip_address: varchar('ip_address', { length: 64 }),
});
