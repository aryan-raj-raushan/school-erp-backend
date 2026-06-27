import { pgTable, varchar, timestamp, unique } from 'drizzle-orm/pg-core';
import { subjects } from './subjects.schema';
import { classes } from './classes.schema';

export const subjectClasses = pgTable('subject_classes', {
  id: varchar('id', { length: 36 }).primaryKey(),
  subject_id: varchar('subject_id', { length: 36 })
    .notNull()
    .references(() => subjects.id, { onDelete: 'cascade' }),
  class_id: varchar('class_id', { length: 36 })
    .notNull()
    .references(() => classes.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniqueSubjectClass: unique('subject_classes_unique').on(t.subject_id, t.class_id),
}));
