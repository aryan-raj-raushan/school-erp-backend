import { pgTable, varchar, boolean, integer, timestamp } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { examTermEnum } from './exam.schema';

/**
 * Reusable exam presets (Unit Test, Mid Term, Half Yearly, Annual, ...) —
 * pre-fills marks/duration defaults in the auto-generate wizard.
 */
export const examTemplates = pgTable('exam_templates', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),

  name: varchar('name', { length: 150 }).notNull(),
  exam_term: examTermEnum('exam_term').notNull(),

  default_exam_marks: integer('default_exam_marks').default(100).notNull(),
  default_passing_marks: integer('default_passing_marks').default(35).notNull(),
  default_duration_minutes: integer('default_duration_minutes').default(180).notNull(),

  is_active: boolean('is_active').default(true).notNull(),
  deleted: boolean('deleted').default(false).notNull(),

  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
  created_by: varchar('created_by', { length: 36 }),
});
