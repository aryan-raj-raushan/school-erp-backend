import { pgTable, varchar, timestamp, unique } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { academicYears } from './academic-years.schema';
import { classes } from './classes.schema';
import { exams } from './exam.schema';

/**
 * Which classes participate in a (whole-school) exam.
 * An exam row no longer carries a single class_id — this table is the
 * source of truth for "which classes are in this exam".
 */
export const examClasses = pgTable(
  'exam_classes',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    school_id: varchar('school_id', { length: 36 })
      .notNull()
      .references(() => schools.id, { onDelete: 'cascade' }),
    exam_id: varchar('exam_id', { length: 36 })
      .notNull()
      .references(() => exams.id, { onDelete: 'cascade' }),
    class_id: varchar('class_id', { length: 36 })
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    academic_year_id: varchar('academic_year_id', { length: 36 })
      .notNull()
      .references(() => academicYears.id, { onDelete: 'cascade' }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniqueExamClass: unique('exam_classes_unique').on(t.exam_id, t.class_id),
  }),
);
