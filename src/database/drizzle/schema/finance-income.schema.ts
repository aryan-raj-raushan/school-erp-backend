import { pgTable, varchar, boolean, timestamp, numeric, date, text } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { financeHeads } from './finance-heads.schema';
import { financeAccounts } from './finance-accounts.schema';

export const financeIncome = pgTable('finance_income', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  income_head_id: varchar('income_head_id', { length: 36 })
    .notNull()
    .references(() => financeHeads.id),
  to_account_id: varchar('to_account_id', { length: 36 })
    .notNull()
    .references(() => financeAccounts.id),
  student_id: varchar('student_id', { length: 36 }),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  date_of_income: date('date_of_income').notNull(),
  remarks: text('remarks'),
  created_by: varchar('created_by', { length: 36 }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
  deleted: boolean('deleted').notNull().default(false),
});
