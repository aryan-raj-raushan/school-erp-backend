import { pgTable, varchar, timestamp, text, pgEnum } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { admissionEnquiries } from './admission-enquiries.schema';

export const enquiryActionEnum = pgEnum('enquiry_action', [
  'NEW_ENQUIRY',
  'FOLLOW_UP_UPDATED',
  'ADMISSION_CONFIRMED',
  'ENQUIRY_REJECTED',
  'REMARKS_UPDATED',
  'TEACHER_ASSIGNED',
]);

export const enquiryHistory = pgTable('enquiry_history', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  enquiry_id: varchar('enquiry_id', { length: 36 })
    .notNull()
    .references(() => admissionEnquiries.id, { onDelete: 'cascade' }),
  assigned_teacher_id: varchar('assigned_teacher_id', { length: 36 }),
  action: enquiryActionEnum('action').notNull(),
  details: text('details'),
  remarks: text('remarks'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
  created_by: varchar('created_by', { length: 36 }),
});