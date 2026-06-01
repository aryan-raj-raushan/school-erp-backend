import { pgTable, pgEnum, varchar, boolean, timestamp, date, numeric, jsonb, text } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { students } from './students.schema';
import { academicYears } from './academic-years.schema';

export const feeStatusEnum = pgEnum('fee_status', ['PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'WAIVED']);
export const paymentModeEnum = pgEnum('payment_mode', ['CASH', 'ONLINE', 'CHEQUE', 'DD', 'NEFT', 'UPI']);

export const feeMasterTypes = pgTable('fee_master_types', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  is_active: boolean('is_active').default(true).notNull(),
  deleted: boolean('deleted').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
  created_by: varchar('created_by', { length: 36 }),
});

export const feeReceipts = pgTable('fee_receipts', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  student_id: varchar('student_id', { length: 36 })
    .notNull()
    .references(() => students.id, { onDelete: 'cascade' }),
  academic_year_id: varchar('academic_year_id', { length: 36 })
    .notNull()
    .references(() => academicYears.id, { onDelete: 'cascade' }),
  receipt_number: varchar('receipt_number', { length: 50 }).notNull(),
  total_amount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
  discount_amount: numeric('discount_amount', { precision: 12, scale: 2 }).default('0'),
  paid_amount: numeric('paid_amount', { precision: 12, scale: 2 }).default('0'),
  due_date: date('due_date'),
  status: feeStatusEnum('status').default('PENDING').notNull(),
  fee_items: jsonb('fee_items'),
  notes: text('notes'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
  created_by: varchar('created_by', { length: 36 }),
});

export const feePayments = pgTable('fee_payments', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  receipt_id: varchar('receipt_id', { length: 36 })
    .notNull()
    .references(() => feeReceipts.id, { onDelete: 'cascade' }),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  payment_mode: paymentModeEnum('payment_mode').notNull(),
  transaction_id: varchar('transaction_id', { length: 100 }),
  order_id: varchar('order_id', { length: 100 }),
  notes: text('notes'),
  paid_at: timestamp('paid_at', { withTimezone: true }).defaultNow().notNull(),
  created_by: varchar('created_by', { length: 36 }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
