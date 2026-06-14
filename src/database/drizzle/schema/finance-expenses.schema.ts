import { pgTable, varchar, boolean, timestamp, numeric, date, text } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { financeHeads } from './finance-heads.schema';
import { financeAccounts } from './finance-accounts.schema';

export const financeExpenses = pgTable('finance_expenses', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  expense_head_id: varchar('expense_head_id', { length: 36 })
    .notNull()
    .references(() => financeHeads.id),
  from_account_id: varchar('from_account_id', { length: 36 })
    .notNull()
    .references(() => financeAccounts.id),
  employee_id: varchar('employee_id', { length: 36 }),
  total_amount: numeric('total_amount', { precision: 15, scale: 2 }).notNull(),
  date_of_expense: date('date_of_expense').notNull(),
  remarks: text('remarks'),
  created_by: varchar('created_by', { length: 36 }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
  deleted: boolean('deleted').notNull().default(false),
});
