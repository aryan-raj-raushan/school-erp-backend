import { pgTable, varchar, boolean, timestamp, date, pgEnum } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { academicYears } from './academic-years.schema';
import { classes } from './classes.schema';
import { sections } from './sections.schema';

export const studentStatusEnum = pgEnum('student_status', [
  'ACTIVE',
  'INACTIVE',
  'TRANSFERRED',
  'GRADUATED',
  'DROPPED',
]);

export const genderEnum = pgEnum('gender', ['MALE', 'FEMALE', 'OTHER']);

export const bloodGroupEnum = pgEnum('blood_group', [
  'A_POSITIVE',
  'A_NEGATIVE',
  'B_POSITIVE',
  'B_NEGATIVE',
  'O_POSITIVE',
  'O_NEGATIVE',
  'AB_POSITIVE',
  'AB_NEGATIVE',
]);

export const students = pgTable('students', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  academic_year_id: varchar('academic_year_id', { length: 36 })
    .notNull()
    .references(() => academicYears.id),
  class_id: varchar('class_id', { length: 36 })
    .notNull()
    .references(() => classes.id),
  section_id: varchar('section_id', { length: 36 }).references(() => sections.id, {
    onDelete: 'set null',
  }),
  admission_number: varchar('admission_number', { length: 50 }).notNull(),
  roll_number: varchar('roll_number', { length: 20 }),
  first_name: varchar('first_name', { length: 100 }).notNull(),
  last_name: varchar('last_name', { length: 100 }),
  date_of_birth: date('date_of_birth'),
  gender: genderEnum('gender'),
  blood_group: bloodGroupEnum('blood_group'),
  religion: varchar('religion', { length: 50 }),
  caste: varchar('caste', { length: 50 }),
  nationality: varchar('nationality', { length: 50 }).default('Indian'),
  aadhaar_number: varchar('aadhaar_number', { length: 12 }),
  address: varchar('address', { length: 500 }),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  pincode: varchar('pincode', { length: 10 }),
  profile_image: varchar('profile_image', { length: 500 }),
  dial_code: varchar('dial_code', { length: 10 }).default('+91'),
  phone_number: varchar('phone_number', { length: 15 }),
  email: varchar('email', { length: 150 }),
  admission_date: date('admission_date'),
  status: studentStatusEnum('status').default('ACTIVE').notNull(),
  is_active: boolean('is_active').default(true).notNull(),
  deleted: boolean('deleted').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
  created_by: varchar('created_by', { length: 36 }),
});
