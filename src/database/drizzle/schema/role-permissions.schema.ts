import { pgTable, varchar, primaryKey } from 'drizzle-orm/pg-core';
import { roles } from './roles.schema';
import { permissions } from './permissions.schema';

export const rolePermissions = pgTable(
  'role_permissions',
  {
    role_id: varchar('role_id', { length: 36 })
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permission_id: varchar('permission_id', { length: 36 })
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.role_id, t.permission_id] }),
  }),
);
