import { pgTable, varchar, text, boolean, timestamp, unique } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';

export const roles = pgTable(
  'roles',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    school_id: varchar('school_id', { length: 36 })
      .notNull()
      .references(() => schools.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    /** Lowercase identifier used to map enum roles to DB roles (e.g. 'teacher', 'driver'). Custom roles have unique slugs too. */
    slug: varchar('slug', { length: 100 }).notNull(),
    description: text('description'),
    /** True for seeded system roles (School Admin, Teacher, etc.) */
    is_system: boolean('is_system').default(false).notNull(),
    is_active: boolean('is_active').default(true).notNull(),
    deleted: boolean('deleted').default(false).notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }),
    created_by: varchar('created_by', { length: 36 }),
  },
  (t) => ({
    uq_school_slug: unique('uq_roles_school_slug').on(t.school_id, t.slug),
  }),
);
