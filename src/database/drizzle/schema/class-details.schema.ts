import { pgTable, varchar, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { classes } from './classes.schema';

export const classDetails = pgTable('class_details', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  class_id: varchar('class_id', { length: 36 })
    .notNull()
    .references(() => classes.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  class_code: varchar('class_code', { length: 50 }),
  year: varchar('year', { length: 50 }),
  max_internal_exam: integer('max_internal_exam').default(4),
  best_internal_exam_count: integer('best_internal_exam_count').default(2),
  no_of_elective_subjects: integer('no_of_elective_subjects').default(0),
  is_enabled: boolean('is_enabled').default(true).notNull(),
  deleted: boolean('deleted').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
  created_by: varchar('created_by', { length: 36 }),
});
