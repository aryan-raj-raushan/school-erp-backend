import { pgTable, varchar, text, timestamp, unique } from 'drizzle-orm/pg-core';

export const permissions = pgTable(
  'permissions',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    display_name: varchar('display_name', { length: 150 }).notNull(),
    resource: varchar('resource', { length: 50 }).notNull(),
    action: varchar('action', { length: 50 }).notNull(),
    description: text('description'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uq_resource_action: unique('uq_permissions_resource_action').on(t.resource, t.action),
  }),
);
