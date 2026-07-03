import { pgTable, varchar, boolean, timestamp, date, time, text, pgEnum } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { academicYears } from './academic-years.schema';
import { admissionSources } from './admission-sources.schema';

export const enquiryStatusEnum = pgEnum('enquiry_status', [
  'NEW',
  'FOLLOW_UP',
  'ADMISSION_CONFIRMED',
  'ONBOARDING_IN_PROGRESS',
  'REJECTED',
]);

export const enquiryGenderEnum = pgEnum('enquiry_gender', ['MALE', 'FEMALE', 'OTHER']);

export const enquiryReligionEnum = pgEnum('enquiry_religion', [
  'HINDU',
  'MUSLIM',
  'CHRISTIAN',
  'SIKH',
  'JAIN',
  'BUDDHIST',
  'OTHER',
]);

export const enquiryCategoryEnum = pgEnum('enquiry_category', [
  'GENERAL',
  'OBC',
  'SC',
  'ST',
  'OTHER',
]);

export const admissionEnquiries = pgTable('admission_enquiries', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  academic_year_id: varchar('academic_year_id', { length: 36 })
    .notNull()
    .references(() => academicYears.id),

  // Basic / Parent Information
  father_name: varchar('father_name', { length: 150 }),
  mother_name: varchar('mother_name', { length: 150 }),
  phone: varchar('phone', { length: 15 }).notNull(),
  dial_code: varchar('dial_code', { length: 10 }).default('+91').notNull(),
  email: varchar('email', { length: 150 }),
  father_occupation: varchar('father_occupation', { length: 100 }),
  mother_occupation: varchar('mother_occupation', { length: 100 }),
  father_qualification: varchar('father_qualification', { length: 100 }),
  mother_qualification: varchar('mother_qualification', { length: 100 }),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  country: varchar('country', { length: 100 }).default('India'),

  // Student Information
  student_name: varchar('student_name', { length: 200 }).notNull(),
  date_of_birth: date('date_of_birth'),
  gender: enquiryGenderEnum('gender'),
  religion: enquiryReligionEnum('religion'),
  category: enquiryCategoryEnum('category'),
  student_current_address: text('student_current_address'),

  // Admission Information
  applying_academic_year_id: varchar('applying_academic_year_id', { length: 36 })
    .notNull()
    .references(() => academicYears.id),
  applying_class_id: varchar('applying_class_id', { length: 36 }).notNull(),
  previous_school_name: varchar('previous_school_name', { length: 300 }),
  previous_class: varchar('previous_class', { length: 100 }),
  registration_fee_required: boolean('registration_fee_required').default(false).notNull(),

  // Enquiry Information
  assigned_teacher_id: varchar('assigned_teacher_id', { length: 36 }),
  next_followup_date: date('next_followup_date'),
  next_followup_time: time('next_followup_time'),
  enquiry_source_id: varchar('enquiry_source_id', { length: 36 })
    .references(() => admissionSources.id, { onDelete: 'set null' }),
  remarks: text('remarks').notNull(),

  // Meta
  status: enquiryStatusEnum('status').default('NEW').notNull(),
  is_active: boolean('is_active').default(true).notNull(),
  deleted: boolean('deleted').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
  created_by: varchar('created_by', { length: 36 }),
});