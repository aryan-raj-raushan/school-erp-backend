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
  department: varchar('department', { length: 100 }),
  class_type: varchar('class_type', { length: 50 }),
  class_sequence: integer('class_sequence'),
  no_of_sessions: integer('no_of_sessions'),
  class_code: varchar('class_code', { length: 50 }),
  default_sections: varchar('default_sections', { length: 26 }),
  numeric_value: integer('numeric_value'),
  description: varchar('description', { length: 255 }),
  is_active: boolean('is_active').default(true).notNull(),
  deleted: boolean('deleted').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
  created_by: varchar('created_by', { length: 36 }),
});
