import { pgTable, varchar, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const companyRoles = pgTable('company_roles', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 60 }).notNull().unique(),
  description: varchar('description', { length: 255 }),
  permissions: jsonb('permissions').$type<string[]>().notNull().default([]),
  created_by: varchar('created_by', { length: 36 }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
});

export type CompanyRoleRow = typeof companyRoles.$inferSelect;
