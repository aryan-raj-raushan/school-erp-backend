import { pgTable, varchar, boolean, timestamp, numeric, integer, pgEnum } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'ACTIVE',
  'EXPIRED',
  'CANCELLED',
  'PENDING',
  'TRIAL',
]);

export const subscriptionPlanEnum = pgEnum('subscription_plan', [
  'MONTHLY',
  'QUARTERLY',
  'HALF_YEARLY',
  'ANNUAL',
  'CUSTOM',
]);

export const subscriptions = pgTable('subscriptions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  plan_name: varchar('plan_name', { length: 100 }).notNull(),
  plan_type: subscriptionPlanEnum('plan_type').notNull(),
  status: subscriptionStatusEnum('status').default('PENDING').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 8 }).default('INR').notNull(),
  max_students: integer('max_students'),
  max_staff: integer('max_staff'),
  features: varchar('features', { length: 2000 }),
  start_date: timestamp('start_date', { withTimezone: true }),
  end_date: timestamp('end_date', { withTimezone: true }),
  trial_end_date: timestamp('trial_end_date', { withTimezone: true }),
  is_trial: boolean('is_trial').default(false).notNull(),
  auto_renew: boolean('auto_renew').default(false).notNull(),
  cancelled_at: timestamp('cancelled_at', { withTimezone: true }),
  cancellation_reason: varchar('cancellation_reason', { length: 500 }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
  created_by: varchar('created_by', { length: 36 }),
});
