import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { subscriptions } from '../../../database/drizzle/schema/subscriptions.schema';
import { subscriptionPayments } from '../../../database/drizzle/schema/subscription-payments.schema';

export type Subscription = InferSelectModel<typeof subscriptions>;
export type NewSubscription = InferInsertModel<typeof subscriptions>;
export type SubscriptionPayment = InferSelectModel<typeof subscriptionPayments>;
export type NewSubscriptionPayment = InferInsertModel<typeof subscriptionPayments>;
