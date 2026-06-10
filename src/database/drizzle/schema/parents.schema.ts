import { pgTable, varchar, boolean, timestamp } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { students } from './students.schema';

export const parents = pgTable('parents', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  first_name: varchar('first_name', { length: 100 }).notNull(),
  last_name: varchar('last_name', { length: 100 }),
  dial_code: varchar('dial_code', { length: 10 }).notNull().default('+91'),
  phone_number: varchar('phone_number', { length: 15 }).notNull(),
  alternate_phone: varchar('alternate_phone', { length: 15 }),
  email: varchar('email', { length: 150 }),
  occupation: varchar('occupation', { length: 100 }),
  annual_income: varchar('annual_income', { length: 50 }),
  aadhaar_number: varchar('aadhaar_number', { length: 12 }),
  profile_image: varchar('profile_image', { length: 500 }),
  is_active: boolean('is_active').default(true).notNull(),
  deleted: boolean('deleted').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
  created_by: varchar('created_by', { length: 36 }),
});

export const parentStudentLinks = pgTable('parent_student_links', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  parent_id: varchar('parent_id', { length: 36 })
    .notNull()
    .references(() => parents.id, { onDelete: 'cascade' }),
  student_id: varchar('student_id', { length: 36 })
    .notNull()
    .references(() => students.id, { onDelete: 'cascade' }),
  relation: varchar('relation', { length: 20 }).notNull(),
  is_primary: boolean('is_primary').default(false).notNull(),
  can_pickup: boolean('can_pickup').default(true).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
