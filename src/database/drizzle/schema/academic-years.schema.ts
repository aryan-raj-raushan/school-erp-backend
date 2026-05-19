import { pgTable, varchar, boolean, timestamp, date } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';

export const academicYears = pgTable('academic_years', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 50 }).notNull(),
  start_date: date('start_date').notNull(),
  end_date: date('end_date').notNull(),
  is_current: boolean('is_current').default(false).notNull(),
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
  created_by: varchar('created_by', { length: 36 }),
});
