import { pgTable, varchar, timestamp, numeric, integer, pgEnum } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { subscriptions } from './subscriptions.schema';

export const oneTimeChargeTypeEnum = pgEnum('one_time_charge_type', [
  'RFID_DEVICE',
  'RFID_INSTALLATION',
  'SETUP',
  'TRAINING',
  'SUPPORT',
  'OTHER',
]);

export const oneTimeChargeStatusEnum = pgEnum('one_time_charge_status', ['PENDING', 'INVOICED']);

export const subscriptionOneTimeCharges = pgTable('subscription_one_time_charges', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  subscription_id: varchar('subscription_id', { length: 36 }).references(() => subscriptions.id, {
    onDelete: 'set null',
  }),
  charge_type: oneTimeChargeTypeEnum('charge_type').notNull(),
  description: varchar('description', { length: 500 }),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  status: oneTimeChargeStatusEnum('status').default('PENDING').notNull(),
  created_by: varchar('created_by', { length: 36 }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
