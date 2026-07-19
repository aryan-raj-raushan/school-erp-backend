import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { subscriptionPlans } from '../../../database/drizzle/schema/subscription-plans.schema';

export type SubscriptionPlanEntity = InferSelectModel<typeof subscriptionPlans>;
export type NewSubscriptionPlan = InferInsertModel<typeof subscriptionPlans>;
