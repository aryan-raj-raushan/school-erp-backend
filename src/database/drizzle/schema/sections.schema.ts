import { pgTable, varchar, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { classes } from './classes.schema';
import { schoolUsers } from './school-users.schema';

export const sections = pgTable('sections', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  class_id: varchar('class_id', { length: 36 })
    .notNull()
    .references(() => classes.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 10 }).notNull(),
  class_teacher_id: varchar('class_teacher_id', { length: 36 }).references(() => schoolUsers.id, {
    onDelete: 'set null',
  }),
  room_number: varchar('room_number', { length: 20 }),
  max_strength: integer('max_strength').default(40),
  is_active: boolean('is_active').default(true).notNull(),
  deleted: boolean('deleted').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
});
