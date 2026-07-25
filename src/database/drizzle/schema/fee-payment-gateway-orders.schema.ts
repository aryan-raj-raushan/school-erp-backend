import { pgTable, pgEnum, varchar, numeric, timestamp, index } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { students } from './students.schema';
import { feeBills } from './fees.schema';

// ─── Fee Payment Gateway Orders ───────────────────────────────────────────────
// One row per online-payment attempt against a fee bill (Razorpay today, other
// gateways later). Kept separate from `fee_bill_payments` — only on successful
// verification does a real fee_bill_payments row get created (via FeesService.payBill).

export const feePaymentGatewayEnum = pgEnum('fee_payment_gateway', ['RAZORPAY']);
export const feePaymentGatewayOrderStatusEnum = pgEnum('fee_payment_gateway_order_status', [
  'CREATED',
  'PAID',
  'FAILED',
]);

export const feePaymentGatewayOrders = pgTable(
  'fee_payment_gateway_orders',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    school_id: varchar('school_id', { length: 36 })
      .notNull()
      .references(() => schools.id, { onDelete: 'cascade' }),
    student_id: varchar('student_id', { length: 36 })
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    bill_id: varchar('bill_id', { length: 36 })
      .notNull()
      .references(() => feeBills.id, { onDelete: 'cascade' }),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    gateway: feePaymentGatewayEnum('gateway').notNull().default('RAZORPAY'),
    gateway_order_id: varchar('gateway_order_id', { length: 100 }).notNull(),
    gateway_payment_id: varchar('gateway_payment_id', { length: 100 }),
    gateway_signature: varchar('gateway_signature', { length: 255 }),
    status: feePaymentGatewayOrderStatusEnum('status').notNull().default('CREATED'),
    // The parent's student_parents row id (JWT `sub` in parent context)
    created_by: varchar('created_by', { length: 36 }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }),
  },
  (t) => ({
    idx_bill: index('fpgo_bill_id_idx').on(t.bill_id),
    idx_student: index('fpgo_student_id_idx').on(t.student_id),
    idx_gateway_order: index('fpgo_gateway_order_id_idx').on(t.gateway_order_id),
  }),
);
