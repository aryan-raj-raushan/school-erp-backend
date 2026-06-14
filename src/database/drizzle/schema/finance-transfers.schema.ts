import { pgTable, varchar, boolean, timestamp, numeric, date, text } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { financeAccounts } from './finance-accounts.schema';

export const financeTransfers = pgTable('finance_transfers', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  from_account_id: varchar('from_account_id', { length: 36 })
    .notNull()
    .references(() => financeAccounts.id),
  to_account_id: varchar('to_account_id', { length: 36 })
    .notNull()
    .references(() => financeAccounts.id),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  date_of_transaction: date('date_of_transaction').notNull(),
  remarks: text('remarks'),
  created_by: varchar('created_by', { length: 36 }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
  deleted: boolean('deleted').notNull().default(false),
});
