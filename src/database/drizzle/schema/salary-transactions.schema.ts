import { pgTable, varchar, numeric, boolean, timestamp, date, text } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { financeAccounts } from './finance-accounts.schema';
import { financeHeads } from './finance-heads.schema';
import { financeExpenses } from './finance-expenses.schema';

export const SALARY_TRANSACTION_STATUSES = ['PENDING', 'PROCESSED', 'PAID'] as const;
export type SalaryTransactionStatus = (typeof SALARY_TRANSACTION_STATUSES)[number];

export const SALARY_PAYMENT_MODES = ['CASH', 'BANK', 'CHEQUE', 'UPI'] as const;
export type SalaryPaymentMode = (typeof SALARY_PAYMENT_MODES)[number];

export const salaryTransactions = pgTable('salary_transactions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  employee_id: varchar('employee_id', { length: 36 }).notNull(),
  salary_month: varchar('salary_month', { length: 7 }).notNull(), // YYYY-MM
  total_amount: numeric('total_amount', { precision: 15, scale: 2 }).notNull(),
  payment_mode: varchar('payment_mode', { length: 20 }).notNull(),
  payment_release_date: date('payment_release_date').notNull(),
  from_account_id: varchar('from_account_id', { length: 36 }).references(() => financeAccounts.id),
  expense_head_id: varchar('expense_head_id', { length: 36 }).references(() => financeHeads.id),
  deduction_amount: numeric('deduction_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  // Links to the finance_expenses row created when this transaction is processed
  // (see SALARY.TRANSACTION_PROCESSED event flow). Null if the transaction has
  // no from_account_id/expense_head_id, or hasn't been processed yet.
  finance_expense_id: varchar('finance_expense_id', { length: 36 }).references(
    () => financeExpenses.id,
  ),
  remarks: text('remarks'),
  status: varchar('status', { length: 20 }).notNull().default('PENDING'),
  deleted: boolean('deleted').notNull().default(false),
  created_by: varchar('created_by', { length: 36 }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
});
