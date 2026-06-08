import { pgTable, varchar, boolean, timestamp, text } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { classes } from './classes.schema';
import { classDetails } from './class-details.schema';
export const syllabi = pgTable('syllabi', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  class_id: varchar('class_id', { length: 36 })
    .notNull()
    .references(() => classes.id, { onDelete: 'cascade' }),
  class_detail_id: varchar('class_detail_id', { length: 36 }).references(
    () => classDetails.id,
    { onDelete: 'set null' },
  ),
  title: varchar('title', { length: 200 }).notNull(),
  content: text('content'),
  is_enabled: boolean('is_enabled').default(true).notNull(),
  deleted: boolean('deleted').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
  created_by: varchar('created_by', { length: 36 }),
});

export const syllabusAttachments = pgTable('syllabus_attachments', {
  id: varchar('id', { length: 36 }).primaryKey(),
  syllabus_id: varchar('syllabus_id', { length: 36 })
    .notNull()
    .references(() => syllabi.id, { onDelete: 'cascade' }),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  file_name: varchar('file_name', { length: 255 }).notNull(),
  file_url: varchar('file_url', { length: 500 }).notNull(),
  file_type: varchar('file_type', { length: 10 }).notNull(),
  file_size: varchar('file_size', { length: 20 }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
