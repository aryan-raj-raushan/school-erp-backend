import { pgTable, varchar, boolean, timestamp, date, pgEnum, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { schools } from './schools.schema';
import { academicYears } from './academic-years.schema';
import { classes } from './classes.schema';

export const examTermEnum = pgEnum('exam_term', ['TERM1', 'TERM2', 'TERM3', 'ANNUAL']);

export const examStatusEnum = pgEnum('exam_status', [
  'DRAFT',
  'UNDER_REVIEW',
  'PUBLISHED',
  'STARTED',
  'COMPLETED',
  'LOCKED',
  'ARCHIVED',
]);

/**
 * Module 2 – Exam
 * An exam instance bound to an academic year, spanning one or more classes
 * (see exam_classes). class_id is deprecated — kept nullable for old rows only.
 */
export const exams = pgTable(
  'exams',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    school_id: varchar('school_id', { length: 36 })
      .notNull()
      .references(() => schools.id, { onDelete: 'cascade' }),
    academic_year_id: varchar('academic_year_id', { length: 36 })
      .notNull()
      .references(() => academicYears.id, { onDelete: 'cascade' }),
    /** @deprecated use exam_classes — retained nullable for pre-multi-class rows */
    class_id: varchar('class_id', { length: 36 }).references(() => classes.id, {
      onDelete: 'cascade',
    }),

    /** Unique short code, e.g. "TERM1-2026" — auto-derived on create, user-editable */
    code: varchar('code', { length: 30 }),

    exam_name: varchar('exam_name', { length: 150 }).notNull(),
    exam_term: examTermEnum('exam_term').notNull(),

    start_date: date('start_date').notNull(),
    end_date: date('end_date').notNull(),

    /** Whether marks from this exam contribute to final report */
    include_in_marks: boolean('include_in_marks').default(true).notNull(),

    /** Lifecycle state. is_published is derived from this going forward. */
    status: examStatusEnum('status').default('DRAFT').notNull(),

    /** @deprecated derived from status IN (PUBLISHED, STARTED, COMPLETED) — kept for old readers */
    is_published: boolean('is_published').default(false).notNull(),

    is_enabled: boolean('is_enabled').default(true).notNull(),
    deleted: boolean('deleted').default(false).notNull(),

    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }),
    created_by: varchar('created_by', { length: 36 }),
  },
  (t) => ({
    // Partial index — only live (non-deleted) exams compete for a code, so a
    // soft-deleted exam's code can be reused without violating uniqueness.
    uniqueCodePerSchool: uniqueIndex('exams_code_school_unique')
      .on(t.school_id, t.code)
      .where(sql`${t.deleted} = false`),
  }),
);
