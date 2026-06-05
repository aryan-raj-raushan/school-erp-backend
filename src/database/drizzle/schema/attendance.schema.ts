import { pgTable, pgEnum, varchar, timestamp, date, unique, boolean } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { students } from './students.schema';
import { academicYears } from './academic-years.schema';

export const attendanceStatusEnum = pgEnum('attendance_status', ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']);

export const attendances = pgTable('attendances', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  student_id: varchar('student_id', { length: 36 })
    .notNull()
    .references(() => students.id, { onDelete: 'cascade' }),
  academic_year_id: varchar('academic_year_id', { length: 36 })
    .notNull()
    .references(() => academicYears.id, { onDelete: 'cascade' }),
  class_section_id: varchar('class_section_id', { length: 36 }).notNull(),
  date: date('date').notNull(),
  status: attendanceStatusEnum('status').notNull(),
  remarks: varchar('remarks', { length: 255 }),
  marked_by: varchar('marked_by', { length: 36 }).notNull(),
  is_late: boolean('is_late').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
}, (t) => ({
  uniqueStudentDate: unique('attendances_student_date_unique').on(t.student_id, t.date),
}));
