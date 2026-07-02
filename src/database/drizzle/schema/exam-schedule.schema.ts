import {
  pgTable,
  varchar,
  boolean,
  timestamp,
  date,
  time,
  integer,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { academicYears } from './academic-years.schema';
import { classes } from './classes.schema';
import { sections } from './sections.schema';
import { exams } from './exam.schema';
import { subjects } from './subjects.schema';
import { schoolUsers } from './school-users.schema';
import { examHallDetails } from './exam-hall-details.schema';

export const subjectTypeEnum = pgEnum('subject_type', [
  'MAIN_EXAM',
  'SECONDARY_EXAM',
  'PRACTICAL_EXAM',
  'ORAL_EXAM',
]);

/**
 * Module 3 – Exam Schedule
 * One row per subject per exam (for a given class & academic year).
 */
export const examSchedules = pgTable('exam_schedules', {
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
  section_id: varchar('section_id', { length: 36 }).references(() => sections.id, {
    onDelete: 'set null',
  }),
  exam_id: varchar('exam_id', { length: 36 })
    .notNull()
    .references(() => exams.id, { onDelete: 'cascade' }),
  subject_id: varchar('subject_id', { length: 36 })
    .notNull()
    .references(() => subjects.id, { onDelete: 'cascade' }),

  subject_name: varchar('subject_name', { length: 150 }).notNull(),
  subject_type: subjectTypeEnum('subject_type').default('MAIN_EXAM').notNull(),

  exam_date: date('exam_date').notNull(),
  start_time: time('start_time').notNull(),
  end_time: time('end_time').notNull(),

  exam_marks: integer('exam_marks').notNull(),
  passing_marks: integer('passing_marks').notNull(),

  /** Invigilator (teacher / staff) */
  exam_invigilator_id: varchar('exam_invigilator_id', { length: 36 }).references(
    () => schoolUsers.id,
    { onDelete: 'set null' },
  ),

  /** Hall / room – references exam_hall_details */
  hall_detail_id: varchar('hall_detail_id', { length: 36 }).references(() => examHallDetails.id, {
    onDelete: 'set null',
  }),

  /**
   * When true the user can add sub-subject rows
   * (e.g. Physics Practical, Physics Oral) linked to this row
   */
  sub_subject_enabled: boolean('sub_subject_enabled').default(false).notNull(),

  /** Self-referencing FK – null for parent rows, set for sub-subject rows */
  parent_schedule_id: varchar('parent_schedule_id', { length: 36 }),

  /** When true, auto-generate/auto-shuffle must never overwrite this row */
  locked: boolean('locked').default(false).notNull(),

  is_enabled: boolean('is_enabled').default(true).notNull(),
  deleted: boolean('deleted').default(false).notNull(),

  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
  created_by: varchar('created_by', { length: 36 }),
});
