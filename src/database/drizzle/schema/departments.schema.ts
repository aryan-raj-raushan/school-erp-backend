import { pgTable, varchar, boolean, timestamp, text, index } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';

export const departments = pgTable(
  'departments',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    school_id: varchar('school_id', { length: 36 })
      .notNull()
      .references(() => schools.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    code: varchar('code', { length: 20 }),
    address: varchar('address', { length: 255 }),
    description: text('description'),
    is_active: boolean('is_active').default(true).notNull(),
    deleted: boolean('deleted').default(false).notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }),
    created_by: varchar('created_by', { length: 36 }),
  },
  (t) => ({
    idx_school: index('departments_school_id_idx').on(t.school_id),
    idx_school_deleted: index('departments_school_deleted_idx').on(t.school_id, t.deleted),
  }),
);
