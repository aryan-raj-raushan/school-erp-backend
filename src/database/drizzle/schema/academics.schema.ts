import { pgTable, pgEnum, varchar, boolean, timestamp, date, text } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { students } from './students.schema';
import { academicYears } from './academic-years.schema';

export const submissionStatusEnum = pgEnum('submission_status', ['PENDING', 'SUBMITTED', 'GRADED', 'LATE']);

export const homeworks = pgTable('homeworks', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 }).notNull().references(() => schools.id, { onDelete: 'cascade' }),
  academic_year_id: varchar('academic_year_id', { length: 36 }).notNull().references(() => academicYears.id, { onDelete: 'cascade' }),
  class_section_id: varchar('class_section_id', { length: 36 }).notNull(),
  subject_id: varchar('subject_id', { length: 36 }).notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  due_date: date('due_date').notNull(),
  assigned_by: varchar('assigned_by', { length: 36 }).notNull(),
  attachment_url: text('attachment_url'),
  deleted: boolean('deleted').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
});

export const homeworkSubmissions = pgTable('homework_submissions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 }).notNull().references(() => schools.id, { onDelete: 'cascade' }),
  homework_id: varchar('homework_id', { length: 36 }).notNull().references(() => homeworks.id, { onDelete: 'cascade' }),
  student_id: varchar('student_id', { length: 36 }).notNull().references(() => students.id, { onDelete: 'cascade' }),
  status: submissionStatusEnum('status').default('PENDING').notNull(),
  submission_url: text('submission_url'),
  remarks: text('remarks'),
  submitted_at: timestamp('submitted_at', { withTimezone: true }),
  graded_at: timestamp('graded_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
});

export const studyMaterials = pgTable('study_materials', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 }).notNull().references(() => schools.id, { onDelete: 'cascade' }),
  academic_year_id: varchar('academic_year_id', { length: 36 }).notNull().references(() => academicYears.id, { onDelete: 'cascade' }),
  class_section_id: varchar('class_section_id', { length: 36 }).notNull(),
  subject_id: varchar('subject_id', { length: 36 }).notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  file_url: text('file_url').notNull(),
  file_type: varchar('file_type', { length: 50 }),
  uploaded_by: varchar('uploaded_by', { length: 36 }).notNull(),
  deleted: boolean('deleted').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
});
