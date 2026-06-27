import { pgTable, varchar, boolean, timestamp, integer } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { academicYears } from './academic-years.schema';
import { exams } from './exam.schema';
import { examHallDetails } from './exam-hall-details.schema';
import { students } from './students.schema';

/**
 * Module 8 – Exam Sitting Plan
 * Assigns a student to a specific room / seat for a given exam.
 * Validated against sitting_capacity of the room.
 */
export const examSittingPlans = pgTable('exam_sitting_plans', {
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
  // hall_plan_id retained as nullable for existing rows — FK removed
  hall_plan_id: varchar('hall_plan_id', { length: 36 }),
  hall_detail_id: varchar('hall_detail_id', { length: 36 })
    .notNull()
    .references(() => examHallDetails.id, { onDelete: 'cascade' }),
  student_id: varchar('student_id', { length: 36 })
    .notNull()
    .references(() => students.id, { onDelete: 'cascade' }),

  seat_number: integer('seat_number'), // optional seat label within room
  roll_number: varchar('roll_number', { length: 30 }),

  deleted: boolean('deleted').default(false).notNull(),

  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
  created_by: varchar('created_by', { length: 36 }),
});
