import { pgTable, varchar, boolean, timestamp, numeric, pgEnum } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { subscriptions } from './subscriptions.schema';
import { invoices } from './invoices.schema';

export const paymentStatusEnum = pgEnum('payment_status', [
  'PENDING',
  'PENDING_VERIFICATION',
  'SUCCESS',
  'FAILED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
]);

export const paymentMethodEnum = pgEnum('payment_method', [
  'RAZORPAY',
  'STRIPE',
  'BANK_TRANSFER',
  'QR_CODE',
  'CHEQUE',
  'CASH',
  'OTHER',
]);

export const subscriptionPayments = pgTable('subscription_payments', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  // Nullable — a payment can be against a one-time-charge-only invoice with
  // no subscription reference; financial history is preserved even if the
  // referenced subscription is later removed.
  subscription_id: varchar('subscription_id', { length: 36 }).references(() => subscriptions.id, {
    onDelete: 'set null',
  }),
  // New invoice-centric payment flow (Milestone 4) — nullable so it doesn't
  // break the legacy subscription-level payment rows created before invoices
  // existed; new payments always set it.
  invoice_id: varchar('invoice_id', { length: 36 }).references(() => invoices.id, {
    onDelete: 'set null',
  }),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 8 }).default('INR').notNull(),
  status: paymentStatusEnum('status').default('PENDING').notNull(),
  payment_method: paymentMethodEnum('payment_method'),
  gateway_payment_id: varchar('gateway_payment_id', { length: 100 }),
  gateway_order_id: varchar('gateway_order_id', { length: 100 }),
  gateway_signature: varchar('gateway_signature', { length: 255 }),
  gateway_response: varchar('gateway_response', { length: 2000 }),
  invoice_number: varchar('invoice_number', { length: 50 }),
  // Manual payment proof (QR/bank-transfer screenshot), uploaded via UploadsService.
  proof_url: varchar('proof_url', { length: 500 }),
  proof_s3_key: varchar('proof_s3_key', { length: 255 }),
  verified_by: varchar('verified_by', { length: 36 }),
  approved_at: timestamp('approved_at', { withTimezone: true }),
  rejected_reason: varchar('rejected_reason', { length: 500 }),
  notes: varchar('notes', { length: 500 }),
  paid_at: timestamp('paid_at', { withTimezone: true }),
  refunded_at: timestamp('refunded_at', { withTimezone: true }),
  refund_amount: numeric('refund_amount', { precision: 10, scale: 2 }),
  is_manual: boolean('is_manual').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
  created_by: varchar('created_by', { length: 36 }),
});
