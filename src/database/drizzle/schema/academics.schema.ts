import { pgTable, pgEnum, varchar, boolean, timestamp, date, text, unique } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { students } from './students.schema';
import { academicYears } from './academic-years.schema';
import { classes } from './classes.schema';
import { classDetails } from './class-details.schema';
import { timetableSessions } from './timetable-sessions.schema';
import { subjects } from './subjects.schema';

export const submissionStatusEnum = pgEnum('submission_status', ['PENDING', 'SUBMITTED', 'GRADED', 'LATE']);
export const homeworkStatusEnum = pgEnum('homework_status', ['DRAFT', 'ACTIVE', 'CLOSED']);

export const homeworks = pgTable('homeworks', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 }).notNull().references(() => schools.id, { onDelete: 'cascade' }),
  academic_year_id: varchar('academic_year_id', { length: 36 }).notNull().references(() => academicYears.id, { onDelete: 'cascade' }),
  timetable_session_id: varchar('timetable_session_id', { length: 36 }).references(() => timetableSessions.id, { onDelete: 'set null' }),
  class_id: varchar('class_id', { length: 36 }).references(() => classes.id, { onDelete: 'set null' }),
  class_detail_id: varchar('class_detail_id', { length: 36 }).references(() => classDetails.id, { onDelete: 'set null' }),
  subject_id: varchar('subject_id', { length: 36 }).references(() => subjects.id, { onDelete: 'set null' }),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  homework_date: date('homework_date'),
  due_date: date('due_date').notNull(),
  status: homeworkStatusEnum('status').default('ACTIVE').notNull(),
  send_notification: boolean('send_notification').default(false).notNull(),
  student_upload_allowed: boolean('student_upload_allowed').default(false).notNull(),
  assigned_by: varchar('assigned_by', { length: 36 }).notNull(),
  deleted: boolean('deleted').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
});

export const homeworkAttachments = pgTable('homework_attachments', {
  id: varchar('id', { length: 36 }).primaryKey(),
  homework_id: varchar('homework_id', { length: 36 }).notNull().references(() => homeworks.id, { onDelete: 'cascade' }),
  school_id: varchar('school_id', { length: 36 }).notNull().references(() => schools.id, { onDelete: 'cascade' }),
  file_name: varchar('file_name', { length: 255 }).notNull(),
  file_url: varchar('file_url', { length: 500 }).notNull(),
  file_type: varchar('file_type', { length: 10 }).notNull(),
  file_size: varchar('file_size', { length: 20 }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
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
}, (t) => ({
  uniqueHwStudent: unique('hw_submissions_hw_student').on(t.homework_id, t.student_id),
}));

export const studyMaterials = pgTable('study_materials', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 }).notNull().references(() => schools.id, { onDelete: 'cascade' }),
  academic_year_id: varchar('academic_year_id', { length: 36 }).notNull().references(() => academicYears.id, { onDelete: 'cascade' }),
  class_id: varchar('class_id', { length: 36 }).references(() => classes.id, { onDelete: 'set null' }),
  subject_id: varchar('subject_id', { length: 36 }).references(() => subjects.id, { onDelete: 'set null' }),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  file_url: text('file_url').notNull(),
  file_type: varchar('file_type', { length: 50 }),
  uploaded_by: varchar('uploaded_by', { length: 36 }).notNull(),
  deleted: boolean('deleted').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
});
