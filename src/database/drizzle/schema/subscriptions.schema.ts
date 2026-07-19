import {
  pgTable,
  varchar,
  boolean,
  timestamp,
  numeric,
  integer,
  pgEnum,
  jsonb,
} from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { subscriptionPlans } from './subscription-plans.schema';
import {
  subscriptionPlanEnum,
  billingModelEnum,
  restrictionModeEnum,
} from './billing-enums.schema';

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'ACTIVE',
  'EXPIRED',
  'CANCELLED',
  'PENDING',
  'TRIAL',
]);

export const subscriptions = pgTable('subscriptions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  // Traceability only — plan fields are copied onto the row below at
  // assignment time so later plan edits don't retroactively change an
  // already-active subscription.
  plan_id: varchar('plan_id', { length: 36 }).references(() => subscriptionPlans.id, {
    onDelete: 'set null',
  }),
  plan_name: varchar('plan_name', { length: 100 }).notNull(),
  plan_type: subscriptionPlanEnum('plan_type').notNull(),
  status: subscriptionStatusEnum('status').default('PENDING').notNull(),
  billing_model: billingModelEnum('billing_model').default('FLAT').notNull(),
  // amount = resolved flat price (FLAT model); price_per_student = per-head
  // rate (PER_STUDENT model, billed against a live headcount at invoice time).
  amount: numeric('amount', { precision: 10, scale: 2 }),
  price_per_student: numeric('price_per_student', { precision: 10, scale: 2 }),
  currency: varchar('currency', { length: 8 }).default('INR').notNull(),
  max_students: integer('max_students'),
  max_staff: integer('max_staff'),
  features: varchar('features', { length: 2000 }),
  start_date: timestamp('start_date', { withTimezone: true }),
  // Hard stop for a fixed-term contract, if any — SubscriptionExpiryTask expires
  // the subscription once this passes. Left null for an open-ended postpaid plan.
  end_date: timestamp('end_date', { withTimezone: true }),
  // Next date the recurring-billing cron should invoice this subscription —
  // separate from end_date since postpaid billing continues indefinitely
  // (in arrears, each cycle) as long as the subscription stays ACTIVE.
  next_billing_date: timestamp('next_billing_date', { withTimezone: true }),
  trial_end_date: timestamp('trial_end_date', { withTimezone: true }),
  is_trial: boolean('is_trial').default(false).notNull(),
  auto_renew: boolean('auto_renew').default(false).notNull(),
  cancelled_at: timestamp('cancelled_at', { withTimezone: true }),
  cancellation_reason: varchar('cancellation_reason', { length: 500 }),
  // Postpaid billing/restriction policy for this subscription.
  grace_period_days: integer('grace_period_days').default(0).notNull(),
  restriction_mode: restrictionModeEnum('restriction_mode').default('NONE').notNull(),
  restricted_resources: jsonb('restricted_resources').$type<string[]>().default([]).notNull(),
  payment_methods_allowed: jsonb('payment_methods_allowed').$type<string[]>().default([]).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
  created_by: varchar('created_by', { length: 36 }),
});
