import { pgTable, varchar, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { companyUsers } from './company-users.schema';
import { schools } from './schools.schema';

export const companyUserSchools = pgTable(
  'company_user_schools',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    user_id: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => companyUsers.id, { onDelete: 'cascade' }),
    school_id: varchar('school_id', { length: 36 })
      .notNull()
      .references(() => schools.id, { onDelete: 'cascade' }),
    granted_by: varchar('granted_by', { length: 36 }).notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniq: uniqueIndex('company_user_school_uniq').on(t.user_id, t.school_id),
  }),
);
