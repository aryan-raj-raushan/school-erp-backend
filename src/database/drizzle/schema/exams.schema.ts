import { pgTable, pgEnum, varchar, boolean, timestamp, date, integer, numeric, text, jsonb } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { academicYears } from './academic-years.schema';
import { students } from './students.schema';

export const examStatusEnum = pgEnum('exam_status', ['DRAFT', 'PUBLISHED', 'ONGOING', 'COMPLETED', 'CANCELLED']);
export const markingSystemEnum = pgEnum('exam_marking_system', ['MARKS', 'GRADES', 'PERCENTAGE']);

export const exams = pgTable('exams', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 }).notNull().references(() => schools.id, { onDelete: 'cascade' }),
  academic_year_id: varchar('academic_year_id', { length: 36 }).notNull().references(() => academicYears.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 150 }).notNull(),
  description: text('description'),
  status: examStatusEnum('status').default('DRAFT').notNull(),
  start_date: date('start_date'),
  end_date: date('end_date'),
  is_active: boolean('is_active').default(true).notNull(),
  deleted: boolean('deleted').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
  created_by: varchar('created_by', { length: 36 }),
});

export const examPolicies = pgTable('exam_policies', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 }).notNull().references(() => schools.id, { onDelete: 'cascade' }),
  exam_id: varchar('exam_id', { length: 36 }).notNull().references(() => exams.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 150 }).notNull(),
  passing_marks: numeric('passing_marks', { precision: 5, scale: 2 }),
  total_marks: numeric('total_marks', { precision: 5, scale: 2 }),
  marking_system: markingSystemEnum('marking_system').default('MARKS'),
  grace_marks: integer('grace_marks').default(0),
  rules: jsonb('rules'),
  deleted: boolean('deleted').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
});

export const examTimetable = pgTable('exam_timetable', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 }).notNull().references(() => schools.id, { onDelete: 'cascade' }),
  exam_id: varchar('exam_id', { length: 36 }).notNull().references(() => exams.id, { onDelete: 'cascade' }),
  class_section_id: varchar('class_section_id', { length: 36 }).notNull(),
  subject_id: varchar('subject_id', { length: 36 }).notNull(),
  date: date('date').notNull(),
  start_time: varchar('start_time', { length: 10 }),
  end_time: varchar('end_time', { length: 10 }),
  room_number: varchar('room_number', { length: 50 }),
  deleted: boolean('deleted').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
});

export const examStudents = pgTable('exam_students', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 }).notNull().references(() => schools.id, { onDelete: 'cascade' }),
  exam_id: varchar('exam_id', { length: 36 }).notNull().references(() => exams.id, { onDelete: 'cascade' }),
  student_id: varchar('student_id', { length: 36 }).notNull().references(() => students.id, { onDelete: 'cascade' }),
  roll_number: varchar('roll_number', { length: 20 }),
  is_eligible: boolean('is_eligible').default(true).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
});

export const examRooms = pgTable('exam_rooms', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 }).notNull().references(() => schools.id, { onDelete: 'cascade' }),
  exam_id: varchar('exam_id', { length: 36 }).notNull().references(() => exams.id, { onDelete: 'cascade' }),
  room_name: varchar('room_name', { length: 100 }).notNull(),
  capacity: integer('capacity').notNull(),
  deleted: boolean('deleted').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
});

export const examSeating = pgTable('exam_seating', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 }).notNull().references(() => schools.id, { onDelete: 'cascade' }),
  exam_id: varchar('exam_id', { length: 36 }).notNull().references(() => exams.id, { onDelete: 'cascade' }),
  exam_room_id: varchar('exam_room_id', { length: 36 }).notNull().references(() => examRooms.id, { onDelete: 'cascade' }),
  student_id: varchar('student_id', { length: 36 }).notNull().references(() => students.id, { onDelete: 'cascade' }),
  seat_number: varchar('seat_number', { length: 20 }).notNull(),
  date: date('date').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const admitCards = pgTable('admit_cards', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 }).notNull().references(() => schools.id, { onDelete: 'cascade' }),
  exam_id: varchar('exam_id', { length: 36 }).notNull().references(() => exams.id, { onDelete: 'cascade' }),
  student_id: varchar('student_id', { length: 36 }).notNull().references(() => students.id, { onDelete: 'cascade' }),
  admit_card_number: varchar('admit_card_number', { length: 50 }).notNull(),
  generated_at: timestamp('generated_at', { withTimezone: true }).defaultNow().notNull(),
  pdf_url: text('pdf_url'),
});

export const examMarks = pgTable('exam_marks', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 }).notNull().references(() => schools.id, { onDelete: 'cascade' }),
  exam_id: varchar('exam_id', { length: 36 }).notNull().references(() => exams.id, { onDelete: 'cascade' }),
  student_id: varchar('student_id', { length: 36 }).notNull().references(() => students.id, { onDelete: 'cascade' }),
  subject_id: varchar('subject_id', { length: 36 }).notNull(),
  class_section_id: varchar('class_section_id', { length: 36 }).notNull(),
  marks_obtained: numeric('marks_obtained', { precision: 6, scale: 2 }),
  total_marks: numeric('total_marks', { precision: 6, scale: 2 }).notNull(),
  is_absent: boolean('is_absent').default(false).notNull(),
  grade: varchar('grade', { length: 5 }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
  created_by: varchar('created_by', { length: 36 }),
});

export const teacherRemarks = pgTable('teacher_remarks', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 }).notNull().references(() => schools.id, { onDelete: 'cascade' }),
  exam_id: varchar('exam_id', { length: 36 }).notNull().references(() => exams.id, { onDelete: 'cascade' }),
  student_id: varchar('student_id', { length: 36 }).notNull().references(() => students.id, { onDelete: 'cascade' }),
  teacher_id: varchar('teacher_id', { length: 36 }).notNull(),
  remark: text('remark').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
});
