import { pgTable, varchar, boolean, timestamp, pgEnum, text, unique } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { academicYears } from './academic-years.schema';
import { exams } from './exam.schema';
import { examSchedules } from './exam-schedule.schema';
import { students } from './students.schema';

export const examAttendanceStatusEnum = pgEnum('exam_attendance_status', [
  'PRESENT',
  'ABSENT',
  'LATE',
]);

/**
 * Module 4 – Student Exam Attendance
 * One row per student per exam schedule entry (main + sub-subject).
 */
export const examAttendance = pgTable(
  'exam_attendance',
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
    schedule_id: varchar('schedule_id', { length: 36 })
      .notNull()
      .references(() => examSchedules.id, { onDelete: 'cascade' }),
    student_id: varchar('student_id', { length: 36 })
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),

    status: examAttendanceStatusEnum('status').notNull(),
    remarks: text('remarks'),

    marked_by: varchar('marked_by', { length: 36 }),
    deleted: boolean('deleted').default(false).notNull(),

    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }),
  },
  (t) => ({
    uq_student_schedule: unique('uq_exam_attendance_student_schedule').on(
      t.student_id,
      t.schedule_id,
    ),
  }),
);
