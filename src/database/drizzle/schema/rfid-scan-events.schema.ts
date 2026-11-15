import { pgTable, varchar, timestamp, bigint, pgEnum, index } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';

export const rfidSourceEnum = pgEnum('rfid_source', ['webhook', 'edzon_poll']);

export const rfidScanEvents = pgTable(
  'rfid_scan_events',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    rfid_card_id: varchar('rfid_card_id', { length: 100 }).notNull(),
    device_id: varchar('device_id', { length: 100 }).notNull(),
    school_id: varchar('school_id', { length: 36 }).references(() => schools.id, {
      onDelete: 'set null',
    }),
    t1: bigint('t1', { mode: 'number' }).notNull(),
    source: rfidSourceEnum('source').notNull().default('webhook'),
    received_at: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    idx_school_received: index('rfid_scan_events_school_received_idx').on(
      t.school_id,
      t.received_at.desc(),
    ),
    idx_received: index('rfid_scan_events_received_idx').on(t.received_at.desc()),
  }),
);

export type RfidScanEventRow = typeof rfidScanEvents.$inferSelect;
export type NewRfidScanEventRow = typeof rfidScanEvents.$inferInsert;
