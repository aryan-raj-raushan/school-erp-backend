import { pgTable, varchar, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { students } from './students.schema';

export const parentRelationEnum = pgEnum('parent_relation', [
  'FATHER',
  'MOTHER',
  'GUARDIAN',
  'GRANDPARENT',
  'SIBLING',
  'OTHER',
]);

export const studentParents = pgTable('student_parents', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  student_id: varchar('student_id', { length: 36 })
    .notNull()
    .references(() => students.id, { onDelete: 'cascade' }),
  relation: parentRelationEnum('relation').notNull(),
  first_name: varchar('first_name', { length: 100 }).notNull(),
  last_name: varchar('last_name', { length: 100 }),
  email: varchar('email', { length: 150 }),
  dial_code: varchar('dial_code', { length: 10 }).notNull().default('+91'),
  phone_number: varchar('phone_number', { length: 15 }).notNull(),
  alternate_phone: varchar('alternate_phone', { length: 15 }),
  occupation: varchar('occupation', { length: 100 }),
  annual_income: varchar('annual_income', { length: 50 }),
  aadhaar_number: varchar('aadhaar_number', { length: 12 }),
  profile_image: varchar('profile_image', { length: 500 }),
  is_primary: boolean('is_primary').default(false).notNull(),
  can_pickup: boolean('can_pickup').default(true).notNull(),
  deleted: boolean('deleted').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
});
