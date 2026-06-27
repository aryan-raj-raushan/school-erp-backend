import {
  pgTable,
  varchar,
  boolean,
  timestamp,
  integer,
  numeric,
  text,
  unique,
} from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { academicYears } from './academic-years.schema';
import { classes } from './classes.schema';
import { sections } from './sections.schema';
import { exams } from './exams.schema';
import { students } from './students.schema';
import { subjects } from './subjects.schema';
import { examSchedules } from './exam-schedule.schema';

/**
 * Stores individual subject marks for each student per exam schedule entry.
 * One row = one student × one exam schedule (subject+type combo).
 */
export const examResults = pgTable(
  'exam_results',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    school_id: varchar('school_id', { length: 36 })
      .notNull()
      .references(() => schools.id, { onDelete: 'cascade' }),
    academic_year_id: varchar('academic_year_id', { length: 36 })
      .notNull()
      .references(() => academicYears.id, { onDelete: 'cascade' }),
    exam_id: varchar('exam_id', { length: 36 })
      .notNull()
      .references(() => exams.id, { onDelete: 'cascade' }),
    exam_schedule_id: varchar('exam_schedule_id', { length: 36 })
      .notNull()
      .references(() => examSchedules.id, { onDelete: 'cascade' }),
    class_id: varchar('class_id', { length: 36 })
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    section_id: varchar('section_id', { length: 36 }).references(() => sections.id, {
      onDelete: 'set null',
    }),
    student_id: varchar('student_id', { length: 36 })
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    subject_id: varchar('subject_id', { length: 36 })
      .notNull()
      .references(() => subjects.id, { onDelete: 'cascade' }),

    /** Marks obtained — null means absent */
    marks_obtained: numeric('marks_obtained', { precision: 6, scale: 2 }),
    /** Max marks from exam_schedules.exam_marks (denormalised for quick report) */
    max_marks: integer('max_marks').notNull(),
    /** Absent flag — if true, marks_obtained is null */
    is_absent: boolean('is_absent').default(false).notNull(),

    /** Whether result is visible to students / parents */
    is_published: boolean('is_published').default(false).notNull(),

    is_enabled: boolean('is_enabled').default(true).notNull(),
    deleted: boolean('deleted').default(false).notNull(),

    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }),
    created_by: varchar('created_by', { length: 36 }),
    updated_by: varchar('updated_by', { length: 36 }),
  },
  (t) => ({
    // one result per student per exam schedule entry
    unq_student_schedule: unique('exam_results_student_schedule_unq').on(
      t.student_id,
      t.exam_schedule_id,
    ),
  }),
);

/**
 * Report Card — generated PDF per student per exam term.
 * A class-wide generation will insert N rows (one per student).
 */
export const reportCards = pgTable(
  'report_cards',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    school_id: varchar('school_id', { length: 36 })
      .notNull()
      .references(() => schools.id, { onDelete: 'cascade' }),
    academic_year_id: varchar('academic_year_id', { length: 36 })
      .notNull()
      .references(() => academicYears.id, { onDelete: 'cascade' }),
    exam_id: varchar('exam_id', { length: 36 })
      .notNull()
      .references(() => exams.id, { onDelete: 'cascade' }),
    class_id: varchar('class_id', { length: 36 })
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    section_id: varchar('section_id', { length: 36 }).references(() => sections.id, {
      onDelete: 'set null',
    }),
    student_id: varchar('student_id', { length: 36 })
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),

    /** S3 signed / public URL for the PDF */
    pdf_url: varchar('pdf_url', { length: 500 }),
    /** S3 object key for deletion / re-generation */
    pdf_s3_key: varchar('pdf_s3_key', { length: 300 }),

    /** Summary stats stored at generation time */
    total_marks: integer('total_marks'),
    marks_obtained: numeric('marks_obtained', { precision: 8, scale: 2 }),
    percentage: numeric('percentage', { precision: 5, scale: 2 }),
    grade: varchar('grade', { length: 20 }),
    rank: integer('rank'),
    remarks: text('remarks'),

    /** Generation status */
    status: varchar('status', { length: 20 }).default('PENDING').notNull(),
    // PENDING | GENERATED | FAILED

    /** When true, student / parent can view the report card */
    is_published: boolean('is_published').default(false).notNull(),

    is_enabled: boolean('is_enabled').default(true).notNull(),
    deleted: boolean('deleted').default(false).notNull(),

    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }),
    created_by: varchar('created_by', { length: 36 }),
  },
  (t) => ({
    unq_report_card: unique('report_cards_school_exam_student_unq').on(
      t.school_id,
      t.exam_id,
      t.student_id,
    ),
  }),
);
