import { pgTable, varchar, numeric, timestamp } from 'drizzle-orm/pg-core';
import { salaryStructureTemplates } from './salary-structure-templates.schema';
import { salaryHeads } from './salary-heads.schema';

export const salaryStructureItems = pgTable('salary_structure_items', {
  id: varchar('id', { length: 36 }).primaryKey(),
  template_id: varchar('template_id', { length: 36 })
    .notNull()
    .references(() => salaryStructureTemplates.id, { onDelete: 'cascade' }),
  salary_head_id: varchar('salary_head_id', { length: 36 })
    .notNull()
    .references(() => salaryHeads.id),
  default_amount: numeric('default_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
