import { pgTable, varchar, boolean, timestamp, date, text } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { salaryStructureTemplates } from './salary-structure-templates.schema';

export const employeeSalaryAssignments = pgTable('employee_salary_assignments', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  employee_id: varchar('employee_id', { length: 36 }).notNull(),
  template_id: varchar('template_id', { length: 36 })
    .notNull()
    .references(() => salaryStructureTemplates.id),
  effective_from: date('effective_from').notNull(),
  remarks: text('remarks'),
  is_active: boolean('is_active').notNull().default(true),
  created_by: varchar('created_by', { length: 36 }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
});
