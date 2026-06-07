import { pgTable, varchar, boolean, timestamp, pgEnum, text } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';

export const schoolRoleEnum = pgEnum('school_role', [
  'SCHOOL_ADMIN',
  'PRINCIPAL',
  'VICE_PRINCIPAL',
  'TEACHER',
  'CLASS_TEACHER',
  'ACCOUNTANT',
  'LIBRARIAN',
]);

export const schoolUsers = pgTable('school_users', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  first_name: varchar('first_name', { length: 100 }).notNull(),
  last_name: varchar('last_name', { length: 100 }),
  email: varchar('email', { length: 150 }),
  dial_code: varchar('dial_code', { length: 10 }).notNull().default('+91'),
  phone_number: varchar('phone_number', { length: 15 }).notNull(),
  password_hash: varchar('password_hash', { length: 255 }),
  role: schoolRoleEnum('role').notNull(),
  profile_image: text('profile_image'),
  gender: varchar('gender', { length: 10 }),
  date_of_birth: timestamp('date_of_birth', { withTimezone: true }),
  blood_group: varchar('blood_group', { length: 15 }),
  address: text('address'),
  is_active: boolean('is_active').default(true).notNull(),
  deleted: boolean('deleted').default(false).notNull(),
  last_login_at: timestamp('last_login_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
  created_by: varchar('created_by', { length: 36 }),
});
