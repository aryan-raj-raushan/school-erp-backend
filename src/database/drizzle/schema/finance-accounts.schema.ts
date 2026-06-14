import { pgTable, varchar, boolean, timestamp, numeric, date } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';

export const FINANCE_ACCOUNT_TYPES = ['Bank', 'Cash', 'E-Wallet'] as const;
export type FinanceAccountType = (typeof FINANCE_ACCOUNT_TYPES)[number];

export const financeAccounts = pgTable('finance_accounts', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  account_type: varchar('account_type', { length: 50 }).notNull(),
  opening_balance: numeric('opening_balance', { precision: 15, scale: 2 }).notNull().default('0'),
  current_balance: numeric('current_balance', { precision: 15, scale: 2 }).notNull().default('0'),
  is_enabled: boolean('is_enabled').notNull().default(true),
  account_start_date: date('account_start_date').notNull(),
  created_by: varchar('created_by', { length: 36 }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
  deleted: boolean('deleted').notNull().default(false),
});
