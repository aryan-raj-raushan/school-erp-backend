import { pgTable, varchar, boolean, timestamp } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';

/**
 * Module 6 – Exam Hall Plan
 * A named grouping of rooms used for a particular exam arrangement.
 */
export const examHallPlans = pgTable('exam_hall_plans', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),

  plan_name: varchar('plan_name', { length: 150 }).notNull(),
  description: varchar('description', { length: 300 }),

  is_enabled: boolean('is_enabled').default(true).notNull(),
  deleted: boolean('deleted').default(false).notNull(),

  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
  created_by: varchar('created_by', { length: 36 }),
});
