import { pgTable, varchar, boolean, timestamp, pgEnum, text, index } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { roles } from './roles.schema';
import { departments } from './departments.schema';

export const schoolRoleEnum = pgEnum('school_role', [
  'SCHOOL_ADMIN',
  'PRINCIPAL',
  'VICE_PRINCIPAL',
  'TEACHER',
  'CLASS_TEACHER',
  'ACCOUNTANT',
  'LIBRARIAN',
]);

export const schoolUsers = pgTable(
  'school_users',
  {
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
    permanent_address: text('permanent_address'),
    city: varchar('city', { length: 100 }),
    joining_date: timestamp('joining_date', { withTimezone: true }),
    employee_code: varchar('employee_code', { length: 50 }),
    department_id: varchar('department_id', { length: 36 }).references(() => departments.id, {
      onDelete: 'set null',
    }),
    father_name: varchar('father_name', { length: 100 }),
    husband_name: varchar('husband_name', { length: 100 }),
    reporting_to_id: varchar('reporting_to_id', { length: 36 }),
    rfid_card_number: varchar('rfid_card_number', { length: 50 }),
    qualification: varchar('qualification', { length: 255 }),
    previous_employer: varchar('previous_employer', { length: 255 }),
    previous_role: varchar('previous_role', { length: 100 }),
    total_experience: varchar('total_experience', { length: 100 }),
    custom_role_id: varchar('custom_role_id', { length: 36 }).references(() => roles.id, {
      onDelete: 'set null',
    }),
    is_active: boolean('is_active').default(true).notNull(),
    deleted: boolean('deleted').default(false).notNull(),
    last_login_at: timestamp('last_login_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }),
    created_by: varchar('created_by', { length: 36 }),
  },
  (t) => ({
    idx_school: index('school_users_school_id_idx').on(t.school_id),
    idx_school_deleted: index('school_users_school_deleted_idx').on(t.school_id, t.deleted),
    idx_phone: index('school_users_phone_idx').on(t.phone_number),
    idx_rfid: index('school_users_rfid_idx').on(t.rfid_card_number),
  }),
);
