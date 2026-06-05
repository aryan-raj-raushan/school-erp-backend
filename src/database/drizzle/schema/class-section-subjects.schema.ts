import { pgTable, varchar, boolean, timestamp, unique } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { sections } from './sections.schema';
import { masterSubjects } from './master-subjects.schema';
import { academicYears } from './academic-years.schema';

export const classSectionSubjects = pgTable('class_section_subjects', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  class_section_id: varchar('class_section_id', { length: 36 })
    .notNull()
    .references(() => sections.id, { onDelete: 'cascade' }),
  subject_id: varchar('subject_id', { length: 36 })
    .notNull()
    .references(() => masterSubjects.id, { onDelete: 'cascade' }),
  academic_year_id: varchar('academic_year_id', { length: 36 })
    .notNull()
    .references(() => academicYears.id, { onDelete: 'cascade' }),
  is_teaching_subject: boolean('is_teaching_subject').default(true).notNull(),
  deleted: boolean('deleted').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
  created_by: varchar('created_by', { length: 36 }),
}, (t) => ({
  uniqueClassSubjectYear: unique('class_section_subjects_unique').on(t.class_section_id, t.subject_id, t.academic_year_id),
}));
