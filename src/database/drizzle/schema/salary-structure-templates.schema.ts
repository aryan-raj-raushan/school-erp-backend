import { pgTable, varchar, boolean, timestamp } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';

export const salaryStructureTemplates = pgTable('salary_structure_templates', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  is_enabled: boolean('is_enabled').notNull().default(true),
  created_by: varchar('created_by', { length: 36 }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
  deleted: boolean('deleted').notNull().default(false),
});
