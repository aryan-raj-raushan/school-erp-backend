import { pgTable, pgEnum, varchar, boolean, timestamp, date, text } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { academicYears } from './academic-years.schema';

export const holidayTypeEnum = pgEnum('holiday_type', ['NATIONAL', 'REGIONAL', 'SCHOOL']);

export const holidays = pgTable('holidays', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  academic_year_id: varchar('academic_year_id', { length: 36 }).references(
    () => academicYears.id,
    { onDelete: 'set null' },
  ),
  name: varchar('name', { length: 150 }).notNull(),
  date: date('date').notNull(),
  type: holidayTypeEnum('type').notNull(),
  description: text('description'),
  is_active: boolean('is_active').default(true).notNull(),
  deleted: boolean('deleted').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
  created_by: varchar('created_by', { length: 36 }),
});
