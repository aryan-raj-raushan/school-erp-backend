import { pgTable, pgEnum, varchar, boolean, timestamp, text } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';

export const communicationStatusEnum = pgEnum('communication_status', ['PENDING', 'APPROVED', 'REJECTED', 'REPLIED']);
export const communicationTypeEnum = pgEnum('communication_type', ['GENERAL', 'REQUEST', 'COMPLAINT', 'FEEDBACK', 'ANNOUNCEMENT']);

export const notifications = pgTable('notifications', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 }).notNull().references(() => schools.id, { onDelete: 'cascade' }),
  sender_id: varchar('sender_id', { length: 36 }).notNull(),
  recipient_id: varchar('recipient_id', { length: 36 }),
  recipient_role: varchar('recipient_role', { length: 30 }),
  title: varchar('title', { length: 200 }).notNull(),
  message: text('message').notNull(),
  is_read: boolean('is_read').default(false).notNull(),
  read_at: timestamp('read_at', { withTimezone: true }),
  deleted: boolean('deleted').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
});

export const communications = pgTable('communications', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 }).notNull().references(() => schools.id, { onDelete: 'cascade' }),
  sender_id: varchar('sender_id', { length: 36 }).notNull(),
  recipient_id: varchar('recipient_id', { length: 36 }).notNull(),
  type: communicationTypeEnum('type').default('GENERAL').notNull(),
  subject: varchar('subject', { length: 200 }).notNull(),
  message: text('message').notNull(),
  reply: text('reply'),
  status: communicationStatusEnum('status').default('PENDING').notNull(),
  is_read: boolean('is_read').default(false).notNull(),
  read_at: timestamp('read_at', { withTimezone: true }),
  replied_at: timestamp('replied_at', { withTimezone: true }),
  reviewed_by: varchar('reviewed_by', { length: 36 }),
  deleted: boolean('deleted').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
});
