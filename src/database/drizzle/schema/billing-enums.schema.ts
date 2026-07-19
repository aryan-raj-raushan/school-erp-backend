import { pgEnum } from 'drizzle-orm/pg-core';

// Shared by both subscriptions.schema.ts and subscription-plans.schema.ts —
// kept in a neutral file since those two tables reference each other
// (subscriptions.plan_id -> subscription_plans.id) and each also needs one
// of these enum types, which would otherwise create a circular import.
export const subscriptionPlanEnum = pgEnum('subscription_plan', [
  'MONTHLY',
  'QUARTERLY',
  'HALF_YEARLY',
  'ANNUAL',
  'CUSTOM',
]);

export const billingModelEnum = pgEnum('billing_model', ['PER_STUDENT', 'FLAT']);

export const restrictionModeEnum = pgEnum('restriction_mode', [
  'NONE',
  'SOFT',
  'PARTIAL',
  'COMPLETE',
]);
