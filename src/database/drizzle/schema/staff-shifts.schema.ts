import { pgTable, varchar, timestamp, date, unique, index, pgEnum } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { schoolUsers } from './school-users.schema';

export const shiftTypeEnum = pgEnum('shift_type', [
  'MORNING',
  'AFTERNOON',
  'EVENING',
  'NIGHT',
  'ADMIN',
  'SPLIT',
]);

export const staffShifts = pgTable(
  'staff_shifts',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    school_id: varchar('school_id', { length: 36 })
      .notNull()
      .references(() => schools.id, { onDelete: 'cascade' }),
    staff_id: varchar('staff_id', { length: 36 })
      .notNull()
      .references(() => schoolUsers.id, { onDelete: 'cascade' }),
    shift_name: varchar('shift_name', { length: 100 }).notNull(),
    shift_type: shiftTypeEnum('shift_type').notNull().default('MORNING'),
    shift_start: varchar('shift_start', { length: 5 }).notNull(),
    shift_end: varchar('shift_end', { length: 5 }).notNull(),
    grace_period_minutes: varchar('grace_period_minutes', { length: 5 }).default('10'),
    working_days: varchar('working_days', { length: 100 }).default('MON,TUE,WED,THU,FRI'),
    effective_from: date('effective_from').notNull(),
    effective_to: date('effective_to').notNull(),
    is_active: varchar('is_active', { length: 5 }).default('true'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }),
  },
  (t) => ({
    idx_school: index('staff_shifts_school_idx').on(t.school_id),
    idx_staff: index('staff_shifts_staff_idx').on(t.staff_id),
  }),
);
