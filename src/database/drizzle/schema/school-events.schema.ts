import {
  pgTable,
  varchar,
  boolean,
  timestamp,
  date,
  time,
  text,
  pgEnum,
  jsonb,
} from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { academicYears } from './academic-years.schema';

export const schoolEventTypeEnum = pgEnum('school_event_type', ['EVENT', 'HOLIDAY']);
export const appliesToEnum = pgEnum('applies_to', ['STUDENTS', 'STAFF', 'BOTH']);

export const schoolEvents = pgTable('school_events', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  academic_year_id: varchar('academic_year_id', { length: 36 })
    .notNull()
    .references(() => academicYears.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 200 }).notNull(),
  type: schoolEventTypeEnum('type').notNull(),
  description: text('description'),
  from_date: date('from_date').notNull(),
  from_time: time('from_time'),
  to_date: date('to_date').notNull(),
  to_time: time('to_time'),
  applies_to: appliesToEnum('applies_to').default('BOTH').notNull(),
  exempt_role_ids: jsonb('exempt_role_ids').default([]).notNull(),
  is_active: boolean('is_active').default(true).notNull(),
  deleted: boolean('deleted').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
  created_by: varchar('created_by', { length: 36 }),
});
