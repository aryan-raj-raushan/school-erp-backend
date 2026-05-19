import { pgTable, varchar, boolean, timestamp } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { classes } from './classes.schema';

export const subjects = pgTable('subjects', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  class_id: varchar('class_id', { length: 36 }).references(() => classes.id, {
    onDelete: 'set null',
  }),
  name: varchar('name', { length: 100 }).notNull(),
  code: varchar('code', { length: 20 }),
  description: varchar('description', { length: 300 }),
  is_elective: boolean('is_elective').default(false).notNull(),
  is_active: boolean('is_active').default(true).notNull(),
  deleted: boolean('deleted').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
  created_by: varchar('created_by', { length: 36 }),
});
