import { pgTable, varchar, boolean, timestamp, numeric } from 'drizzle-orm/pg-core';
import { billingModelEnum, subscriptionPlanEnum } from './billing-enums.schema';

// Reusable plan catalog — a subscription can either point at one of these
// (fields copied over at assignment time) or be fully custom/ad-hoc.
export const subscriptionPlans = pgTable('subscription_plans', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  billing_model: billingModelEnum('billing_model').notNull(),
  flat_amount: numeric('flat_amount', { precision: 10, scale: 2 }),
  price_per_student: numeric('price_per_student', { precision: 10, scale: 2 }),
  billing_cycle: subscriptionPlanEnum('billing_cycle').notNull(),
  is_active: boolean('is_active').default(true).notNull(),
  created_by: varchar('created_by', { length: 36 }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
});
