import { pgTable, varchar, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { classes } from './classes.schema';
import { classDetails } from './class-details.schema';
import { timetableSessions } from './timetable-sessions.schema';

export const subjects = pgTable('subjects', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  class_id: varchar('class_id', { length: 36 }).references(() => classes.id, {
    onDelete: 'set null',
  }),
  timetable_session_id: varchar('timetable_session_id', { length: 36 }).references(
    () => timetableSessions.id,
    { onDelete: 'set null' },
  ),
  class_detail_id: varchar('class_detail_id', { length: 36 }).references(
    () => classDetails.id,
    { onDelete: 'set null' },
  ),
  name: varchar('name', { length: 100 }).notNull(),
  code: varchar('code', { length: 20 }),
  display_order: integer('display_order').default(0),
  total_marks: integer('total_marks').default(100),
  passing_marks: integer('passing_marks').default(0),
  description: varchar('description', { length: 300 }),
  is_elective: boolean('is_elective').default(false).notNull(),
  is_active: boolean('is_active').default(true).notNull(),
  deleted: boolean('deleted').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
  created_by: varchar('created_by', { length: 36 }),
});
