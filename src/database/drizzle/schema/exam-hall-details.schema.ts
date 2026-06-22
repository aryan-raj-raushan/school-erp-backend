import { pgTable, varchar, boolean, timestamp, integer } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { examHallPlans } from './exam-hall-plan.schema';

/**
 * Module 7 – Exam Hall Details
 * Individual rooms that belong to an Exam Hall Plan.
 */
export const examHallDetails = pgTable('exam_hall_details', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  hall_plan_id: varchar('hall_plan_id', { length: 36 })
    .notNull()
    .references(() => examHallPlans.id, { onDelete: 'cascade' }),

  room_name: varchar('room_name', { length: 150 }).notNull(), // "Room 101", "Sports Hall"
  sitting_capacity: integer('sitting_capacity').notNull().default(0),

  is_enabled: boolean('is_enabled').default(true).notNull(),
  deleted: boolean('deleted').default(false).notNull(),

  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
  created_by: varchar('created_by', { length: 36 }),
});
