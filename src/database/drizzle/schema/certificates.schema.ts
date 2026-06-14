import {
  pgTable,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  pgEnum,
} from 'drizzle-orm/pg-core';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const certificateStatusEnum = pgEnum('certificate_status', [
  'DRAFT',
  'GENERATED',
  'CANCELLED',
]);

// ─── Transfer Certificate ─────────────────────────────────────────────────────

export const transferCertificates = pgTable('transfer_certificates', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 }).notNull(),
  student_id: varchar('student_id', { length: 36 }).notNull(),
  academic_year_id: varchar('academic_year_id', { length: 36 }).notNull(),
  class_id: varchar('class_id', { length: 36 }).notNull(),
  section_id: varchar('section_id', { length: 36 }),

  // Certificate fields
  reference_no: varchar('reference_no', { length: 50 }).notNull(),
  qualified_for_higher_class: varchar('qualified_for_higher_class', { length: 10 }).notNull(), // YES / NO
  leaving_date: varchar('leaving_date', { length: 20 }).notNull(), // stored as string DD/MM/YYYY
  total_working_days: integer('total_working_days').notNull(),
  total_present: integer('total_present').notNull(),
  extra_activities: text('extra_activities'),
  candidate_character: varchar('candidate_character', { length: 100 }).notNull(),
  leaving_reason: text('leaving_reason').notNull(),
  fees_due: varchar('fees_due', { length: 10 }).notNull().default('NO'), // YES / NO / amount

  // PDF
  pdf_url: text('pdf_url'),
  pdf_s3_key: text('pdf_s3_key'),
  status: certificateStatusEnum('status').default('DRAFT').notNull(),

  // Audit
  deleted: boolean('deleted').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
  created_by: varchar('created_by', { length: 36 }),
});

// ─── Bonafide Certificate ─────────────────────────────────────────────────────

export const bonafideCertificates = pgTable('bonafide_certificates', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 }).notNull(),
  student_id: varchar('student_id', { length: 36 }).notNull(),
  academic_year_id: varchar('academic_year_id', { length: 36 }).notNull(),
  class_id: varchar('class_id', { length: 36 }).notNull(),
  section_id: varchar('section_id', { length: 36 }),

  // Certificate fields
  reference_no: varchar('reference_no', { length: 50 }).notNull(),
  purpose: text('purpose').notNull(),

  // PDF
  pdf_url: text('pdf_url'),
  pdf_s3_key: text('pdf_s3_key'),
  status: certificateStatusEnum('status').default('DRAFT').notNull(),

  // Audit
  deleted: boolean('deleted').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
  created_by: varchar('created_by', { length: 36 }),
});