import { pgTable, varchar, boolean, timestamp, integer, numeric } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';

export const examGrading = pgTable('exam_grading', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),

  grade_name: varchar('grade_name', { length: 20 }).notNull(),
  from_percentage: numeric('from_percentage', { precision: 5, scale: 2 }).notNull(),
  to_percentage: numeric('to_percentage', { precision: 5, scale: 2 }).notNull(),
  sequence_index: integer('sequence_index').default(0).notNull(),
  description: varchar('description', { length: 200 }),

  is_enabled: boolean('is_enabled').default(true).notNull(),
  deleted: boolean('deleted').default(false).notNull(),

  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
  created_by: varchar('created_by', { length: 36 }),
});
