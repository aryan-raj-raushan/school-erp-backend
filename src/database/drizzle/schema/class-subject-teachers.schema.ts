import { pgTable, varchar, boolean, timestamp, unique } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { academicYears } from './academic-years.schema';
import { classes } from './classes.schema';
import { subjects } from './subjects.schema';
import { schoolUsers } from './school-users.schema';

export const classSubjectTeachers = pgTable(
  'class_subject_teachers',
  {
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
    subject_id: varchar('subject_id', { length: 36 })
      .notNull()
      .references(() => subjects.id, { onDelete: 'cascade' }),
    teacher_id: varchar('teacher_id', { length: 36 })
      .notNull()
      .references(() => schoolUsers.id, { onDelete: 'cascade' }),
    is_active: boolean('is_active').default(true).notNull(),
    deleted: boolean('deleted').default(false).notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }),
    created_by: varchar('created_by', { length: 36 }),
  },
  (t) => ({
    uniqueClassSubjectYear: unique('class_subject_teachers_unique').on(
      t.class_id,
      t.subject_id,
      t.academic_year_id,
    ),
  }),
);
