import { pgTable, varchar, timestamp, date, pgEnum } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';

export const rfidDeviceStatusEnum = pgEnum('rfid_device_status', [
  'IN_STOCK',
  'ASSIGNED',
  'INSTALLED',
  'MAINTENANCE',
  'RETURNED',
  'RETIRED',
]);

export const rfidDevices = pgTable('rfid_devices', {
  id: varchar('id', { length: 36 }).primaryKey(),
  device_identifier: varchar('device_identifier', { length: 100 }).notNull().unique(),
  device_model: varchar('device_model', { length: 100 }),
  purchase_date: date('purchase_date'),
  status: rfidDeviceStatusEnum('status').default('IN_STOCK').notNull(),
  assigned_school_id: varchar('assigned_school_id', { length: 36 }).references(() => schools.id, {
    onDelete: 'set null',
  }),
  installation_date: date('installation_date'),
  warranty_expiry: date('warranty_expiry'),
  notes: varchar('notes', { length: 500 }),
  created_by: varchar('created_by', { length: 36 }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
});
