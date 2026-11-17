import { pgTable, varchar, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { companyRoles } from './company-roles.schema';

export const companyRoleEnum = pgEnum('company_role', [
  'SUPER_ADMIN',
  'ADMIN',
  'SUPPORT',
  'SALES',
  'OPERATOR',
]);

export const companyUsers = pgTable('company_users', {
  id: varchar('id', { length: 36 }).primaryKey(),
  first_name: varchar('first_name', { length: 100 }).notNull(),
  last_name: varchar('last_name', { length: 100 }),
  email: varchar('email', { length: 150 }).notNull().unique(),
  password_hash: varchar('password_hash', { length: 255 }).notNull(),
  role: companyRoleEnum('role').default('ADMIN').notNull(),
  company_role_id: varchar('company_role_id', { length: 36 }).references(() => companyRoles.id, {
    onDelete: 'set null',
  }),
  is_active: boolean('is_active').default(true).notNull(),
  deleted: boolean('deleted').default(false).notNull(),
  last_login_at: timestamp('last_login_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
});
