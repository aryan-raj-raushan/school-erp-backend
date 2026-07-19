import { pgTable, varchar, timestamp, numeric, integer, pgEnum } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { subscriptions } from './subscriptions.schema';

export const invoiceStatusEnum = pgEnum('invoice_status', [
  'DRAFT',
  'ISSUED',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'VOID',
]);

export const invoiceLineTypeEnum = pgEnum('invoice_line_type', ['SUBSCRIPTION', 'ONE_TIME_CHARGE']);

export const invoices = pgTable('invoices', {
  id: varchar('id', { length: 36 }).primaryKey(),
  invoice_number: varchar('invoice_number', { length: 30 }).notNull().unique(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  subscription_id: varchar('subscription_id', { length: 36 }).references(() => subscriptions.id, {
    onDelete: 'set null',
  }),
  billing_period_start: timestamp('billing_period_start', { withTimezone: true }),
  billing_period_end: timestamp('billing_period_end', { withTimezone: true }),
  // Snapshotted at generation time for PER_STUDENT billing, so a later
  // enrollment change never retroactively changes an issued invoice.
  student_count_snapshot: integer('student_count_snapshot'),
  subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
  tax_amount: numeric('tax_amount', { precision: 10, scale: 2 }).default('0').notNull(),
  discount_amount: numeric('discount_amount', { precision: 10, scale: 2 }).default('0').notNull(),
  total_amount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  amount_paid: numeric('amount_paid', { precision: 10, scale: 2 }).default('0').notNull(),
  status: invoiceStatusEnum('status').default('ISSUED').notNull(),
  due_date: timestamp('due_date', { withTimezone: true }).notNull(),
  issued_at: timestamp('issued_at', { withTimezone: true }).defaultNow().notNull(),
  paid_at: timestamp('paid_at', { withTimezone: true }),
  notes: varchar('notes', { length: 500 }),
  pdf_url: varchar('pdf_url', { length: 500 }),
  pdf_s3_key: varchar('pdf_s3_key', { length: 255 }),
  created_by: varchar('created_by', { length: 36 }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
});

export const invoiceLineItems = pgTable('invoice_line_items', {
  id: varchar('id', { length: 36 }).primaryKey(),
  invoice_id: varchar('invoice_id', { length: 36 })
    .notNull()
    .references(() => invoices.id, { onDelete: 'cascade' }),
  description: varchar('description', { length: 255 }).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  unit_price: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  line_type: invoiceLineTypeEnum('line_type').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Atomic per-year sequence for human-readable invoice numbers (INV-{year}-{seq}).
export const invoiceCounters = pgTable('invoice_counters', {
  year: integer('year').primaryKey(),
  last_seq: integer('last_seq').default(0).notNull(),
});
