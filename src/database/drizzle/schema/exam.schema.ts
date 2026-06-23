import { pgTable, varchar, boolean, timestamp, date, pgEnum } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { academicYears } from './academic-years.schema';
import { classes } from './classes.schema';

export const examTermEnum = pgEnum('exam_term', ['TERM1', 'TERM2', 'TERM3', 'ANNUAL']);

/**
 * Module 2 – Exam
 * An exam instance bound to an academic year and a class.
 * Multiple sections of the same class share the same exam.
 */
export const exams = pgTable('exams', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  academic_year_id: varchar('academic_year_id', { length: 36 })
    .notNull()
    .references(() => academicYears.id, { onDelete: 'cascade' }),
  class_id: varchar('class_id', { length: 36 })
    .notNull()
    .references(() => classes.id, { onDelete: 'cascade' }),

  exam_name: varchar('exam_name', { length: 150 }).notNull(),
  exam_term: examTermEnum('exam_term').notNull(),

  start_date: date('start_date').notNull(),
  end_date: date('end_date').notNull(),

  /** Whether marks from this exam contribute to final report */
  include_in_marks: boolean('include_in_marks').default(true).notNull(),

  /** Schedule published → exam is live */
  is_published: boolean('is_published').default(false).notNull(),

  is_enabled: boolean('is_enabled').default(true).notNull(),
  deleted: boolean('deleted').default(false).notNull(),

  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
  created_by: varchar('created_by', { length: 36 }),
});
