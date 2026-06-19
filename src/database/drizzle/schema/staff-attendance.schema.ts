import { pgTable, varchar, timestamp, date, unique, boolean, index } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { schoolUsers } from './school-users.schema';
import { attendanceStatusEnum } from './attendance.schema';

export const staffAttendances = pgTable(
  'staff_attendances',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    school_id: varchar('school_id', { length: 36 })
      .notNull()
      .references(() => schools.id, { onDelete: 'cascade' }),
    staff_id: varchar('staff_id', { length: 36 })
      .notNull()
      .references(() => schoolUsers.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    status: attendanceStatusEnum('status').notNull(),
    remarks: varchar('remarks', { length: 255 }),
    marked_by: varchar('marked_by', { length: 36 }).notNull(),
    is_late: boolean('is_late').default(false).notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }),
  },
  (t) => ({
    uniqueStaffDate: unique('staff_attendances_staff_date_unique').on(t.staff_id, t.date),
    idx_school_date: index('staff_attendances_school_date_idx').on(t.school_id, t.date),
    idx_staff: index('staff_attendances_staff_id_idx').on(t.staff_id),
  }),
);

export type StaffAttendanceRow = typeof staffAttendances.$inferSelect;
export type NewStaffAttendanceRow = typeof staffAttendances.$inferInsert;
