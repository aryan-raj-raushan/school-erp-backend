import { pgTable, varchar, boolean, timestamp, date } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';

export const admissionSources = pgTable('admission_sources', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 200 }).notNull(),
  start_date: date('start_date'),
  end_date: date('end_date'),
  is_enabled: boolean('is_enabled').default(true).notNull(),
  deleted: boolean('deleted').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
  created_by: varchar('created_by', { length: 36 }),
});