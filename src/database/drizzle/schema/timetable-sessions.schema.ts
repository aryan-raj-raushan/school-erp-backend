import { pgTable, pgEnum, varchar, boolean, timestamp, date, text } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { academicYears } from './academic-years.schema';

export const timetableSessionTypeEnum = pgEnum('timetable_session_type', [
  'summer',
  'winter',
  'spring',
  'autumn',
  'annual',
  'quarterly',
]);

export const timetableSessions = pgTable('timetable_sessions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  academic_year_id: varchar('academic_year_id', { length: 36 }).references(
    () => academicYears.id,
    { onDelete: 'set null' },
  ),
  name: varchar('name', { length: 100 }).notNull(),
  session_code: varchar('session_code', { length: 50 }),
  timetable_session: timetableSessionTypeEnum('timetable_session').notNull(),
  start_date: date('start_date').notNull(),
  end_date: date('end_date').notNull(),
  description: text('description'),
  is_enabled: boolean('is_enabled').default(true).notNull(),
  is_active_session: boolean('is_active_session').default(false).notNull(),
  deleted: boolean('deleted').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
  created_by: varchar('created_by', { length: 36 }),
});
