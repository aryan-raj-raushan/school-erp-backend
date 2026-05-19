import { pgTable, varchar, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { students } from './students.schema';

export const documentTypeEnum = pgEnum('document_type', [
  'BIRTH_CERTIFICATE',
  'TRANSFER_CERTIFICATE',
  'AADHAAR',
  'PHOTO',
  'MEDICAL_CERTIFICATE',
  'CASTE_CERTIFICATE',
  'INCOME_CERTIFICATE',
  'PREVIOUS_MARKSHEET',
  'OTHER',
]);

export const studentDocuments = pgTable('student_documents', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  student_id: varchar('student_id', { length: 36 })
    .notNull()
    .references(() => students.id, { onDelete: 'cascade' }),
  document_type: documentTypeEnum('document_type').notNull(),
  file_name: varchar('file_name', { length: 255 }).notNull(),
  file_url: varchar('file_url', { length: 1000 }).notNull(),
  file_size: varchar('file_size', { length: 20 }),
  mime_type: varchar('mime_type', { length: 100 }),
  s3_key: varchar('s3_key', { length: 500 }),
  is_verified: boolean('is_verified').default(false),
  verified_by: varchar('verified_by', { length: 36 }),
  verified_at: timestamp('verified_at', { withTimezone: true }),
  deleted: boolean('deleted').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
  uploaded_by: varchar('uploaded_by', { length: 36 }),
});
