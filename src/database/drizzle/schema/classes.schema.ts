import { pgTable, varchar, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { academicYears } from './academic-years.schema';

export const classes = pgTable('classes', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  academic_year_id: varchar('academic_year_id', { length: 36 })
    .notNull()
    .references(() => academicYears.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 50 }).notNull(),
  numeric_value: integer('numeric_value'),
  description: varchar('description', { length: 255 }),
  is_active: boolean('is_active').default(true).notNull(),
  deleted: boolean('deleted').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
  created_by: varchar('created_by', { length: 36 }),
});
