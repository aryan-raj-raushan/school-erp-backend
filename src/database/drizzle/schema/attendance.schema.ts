import {
  pgTable,
  pgEnum,
  varchar,
  timestamp,
  date,
  unique,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { students } from './students.schema';
import { academicYears } from './academic-years.schema';

export const attendanceStatusEnum = pgEnum('attendance_status', [
  'PRESENT',
  'ABSENT',
  'LATE',
  'EXCUSED',
]);

export const attendances = pgTable(
  'attendances',
  {
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
  },
  (t) => ({
    uniqueStudentDate: unique('attendances_student_date_unique').on(t.student_id, t.date),
    idx_school_date: index('attendances_school_date_idx').on(t.school_id, t.date),
    idx_student: index('attendances_student_id_idx').on(t.student_id),
    idx_class_section_date: index('attendances_section_date_idx').on(t.class_section_id, t.date),
  }),
);
