import { pgTable, pgEnum, varchar, boolean, integer, timestamp } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';

export const notificationEventEnum = pgEnum('notification_event', [
  'ABSENT',
  'LATE',
  'HOLIDAY',
  'LEAVE_APPROVED',
  'LEAVE_REJECTED',
  'EARLY_EXIT',
  'MISSING_PUNCH',
  'GATE_PASS_APPROVED',
]);

export const notificationChannelEnum = pgEnum('notification_channel', [
  'EMAIL',
  'SMS',
  'PUSH',
  'ALL',
]);

export const notificationRules = pgTable('notification_rules', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  event_type: notificationEventEnum('event_type').notNull(),
  notify_parent: boolean('notify_parent').default(true).notNull(),
  notify_student: boolean('notify_student').default(false).notNull(),
  notify_teacher: boolean('notify_teacher').default(false).notNull(),
  channel: notificationChannelEnum('channel').default('SMS').notNull(),
  delay_minutes: integer('delay_minutes').default(0).notNull(),
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
});
