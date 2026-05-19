import { pgTable, varchar, boolean, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { academicYears } from './academic-years.schema';

export const promotionStatusEnum = pgEnum('promotion_status', [
  'PENDING',
  'PROMOTED',
  'FAILED',
  'DETAINED',
  'TRANSFERRED',
  'GRADUATED',
  'DROPPED',
]);

export const promotionLogs = pgTable('promotion_logs', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  student_id: varchar('student_id', { length: 36 }).notNull(),
  from_academic_year_id: varchar('from_academic_year_id', { length: 36 })
    .notNull()
    .references(() => academicYears.id),
  to_academic_year_id: varchar('to_academic_year_id', { length: 36 }).references(
    () => academicYears.id,
  ),
  from_class_id: varchar('from_class_id', { length: 36 }),
  to_class_id: varchar('to_class_id', { length: 36 }),
  from_section_id: varchar('from_section_id', { length: 36 }),
  to_section_id: varchar('to_section_id', { length: 36 }),
  from_roll_number: varchar('from_roll_number', { length: 20 }),
  to_roll_number: varchar('to_roll_number', { length: 20 }),
  status: promotionStatusEnum('status').notNull(),
  remarks: varchar('remarks', { length: 500 }),
  promoted_by: varchar('promoted_by', { length: 36 }).notNull(),
  batch_id: varchar('batch_id', { length: 36 }),
  is_bulk: boolean('is_bulk').default(false).notNull(),
  student_count: integer('student_count'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
