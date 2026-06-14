import { pgTable, varchar, boolean, timestamp } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';

export const FINANCE_HEAD_TYPES = ['Income', 'Expense'] as const;
export type FinanceHeadType = (typeof FINANCE_HEAD_TYPES)[number];

export const financeHeads = pgTable('finance_heads', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  head_type: varchar('head_type', { length: 20 }).notNull(), // Income | Expense
  is_enabled: boolean('is_enabled').notNull().default(true),
  created_by: varchar('created_by', { length: 36 }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
  deleted: boolean('deleted').notNull().default(false),
});
