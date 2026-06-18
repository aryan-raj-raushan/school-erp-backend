import { pgTable, varchar, timestamp, bigint, pgEnum } from 'drizzle-orm/pg-core';

export const rfidSourceEnum = pgEnum('rfid_source', ['webhook', 'edzon_poll']);

export const rfidScanEvents = pgTable('rfid_scan_events', {
  id: varchar('id', { length: 36 }).primaryKey(),
  rfid_card_id: varchar('rfid_card_id', { length: 100 }).notNull(),
  device_id: varchar('device_id', { length: 100 }).notNull(),
  t1: bigint('t1', { mode: 'number' }).notNull(),
  source: rfidSourceEnum('source').notNull().default('webhook'),
  received_at: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
});

export type RfidScanEventRow = typeof rfidScanEvents.$inferSelect;
export type NewRfidScanEventRow = typeof rfidScanEvents.$inferInsert;
