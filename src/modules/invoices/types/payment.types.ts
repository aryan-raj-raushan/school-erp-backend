import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { subscriptionPayments } from '../../../database/drizzle/schema/subscription-payments.schema';

export type InvoicePayment = InferSelectModel<typeof subscriptionPayments>;
export type NewInvoicePayment = InferInsertModel<typeof subscriptionPayments>;
