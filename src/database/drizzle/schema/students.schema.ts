import {
  pgTable,
  varchar,
  boolean,
  timestamp,
  date,
  text,
  integer,
  pgEnum,
  numeric,
  index,
} from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { academicYears } from './academic-years.schema';
import { classes } from './classes.schema';
import { sections } from './sections.schema';
import { admissionEnquiries } from './admission-enquiries.schema';

// ─── Enums ────────────────────────────────────────────────────────────────────

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

export const religionEnum = pgEnum('religion', [
  'HINDU',
  'MUSLIM',
  'CHRISTIAN',
  'SIKH',
  'JAIN',
  'BUDDHIST',
  'OTHER',
]);

export const categoryEnum = pgEnum('student_category', ['GENERAL', 'OBC', 'SC', 'ST', 'OTHER']);

export const qualificationEnum = pgEnum('parent_qualification', [
  'BELOW_10TH',
  'CLASS_10TH',
  'CLASS_12TH',
  'UNDERGRADUATE',
  'POSTGRADUATE',
  'MASTERS',
  'DOCTORATE',
  'OTHER',
]);

export const parentRelationEnum = pgEnum('parent_relation', [
  'FATHER',
  'MOTHER',
  'GUARDIAN',
  'GRANDPARENT',
  'SIBLING',
  'OTHER',
]);

export const documentTypeEnum = pgEnum('student_document_type', [
  'BIRTH_CERTIFICATE',
  'TRANSFER_CERTIFICATE',
  'AADHAAR',
  'PHOTO',
  'MEDICAL_CERTIFICATE',
  'CASTE_CERTIFICATE',
  'INCOME_CERTIFICATE',
  'PREVIOUS_MARKSHEET',
  'MERIT_CERTIFICATE',
  'REPORT',
  'OTHER',
]);

export const documentFileTypeEnum = pgEnum('document_file_type', ['PDF', 'IMAGE']);

// ─── Students (core basic info) ───────────────────────────────────────────────

export const students = pgTable(
  'students',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    school_id: varchar('school_id', { length: 36 })
      .notNull()
      .references(() => schools.id, { onDelete: 'cascade' }),

    // System auto-generated reference number
    system_number: integer('system_number').notNull().default(0),

    // Link back to the admission enquiry this student was onboarded from, if any
    admission_enquiry_id: varchar('admission_enquiry_id', { length: 36 }).references(
      () => admissionEnquiries.id,
      { onDelete: 'set null' },
    ),

    // Basic Info
    first_name: varchar('first_name', { length: 100 }).notNull(),
    last_name: varchar('last_name', { length: 100 }),
    date_of_birth: date('date_of_birth'),
    gender: genderEnum('gender'),
    blood_group: bloodGroupEnum('blood_group'),
    religion: varchar('religion', { length: 50 }),
    category: categoryEnum('category'),
    caste: varchar('caste', { length: 50 }),
    nationality: varchar('nationality', { length: 50 }).default('Indian'),
    aadhaar_number: varchar('aadhaar_number', { length: 12 }),
    id_card_number: varchar('id_card_number', { length: 50 }),
    height_cm: numeric('height_cm', { precision: 5, scale: 2 }),
    weight_kg: numeric('weight_kg', { precision: 5, scale: 2 }),
    profile_image: varchar('profile_image', { length: 500 }),

    // Contact
    dial_code: varchar('dial_code', { length: 10 }).default('+91'),
    phone_number: varchar('phone_number', { length: 15 }),
    email: varchar('email', { length: 150 }),

    // Status
    status: studentStatusEnum('status').default('ACTIVE').notNull(),
    is_enabled: boolean('is_enabled').default(true).notNull(),
    deleted: boolean('deleted').default(false).notNull(),

    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }),
    created_by: varchar('created_by', { length: 36 }),
  },
  (t) => ({
    idx_school: index('students_school_id_idx').on(t.school_id),
    idx_school_deleted: index('students_school_deleted_idx').on(t.school_id, t.deleted),
    idx_school_status: index('students_school_status_idx').on(t.school_id, t.status),
    idx_phone: index('students_phone_idx').on(t.phone_number),
    idx_admission_enquiry: index('students_admission_enquiry_id_idx').on(t.admission_enquiry_id),
  }),
);

// ─── Student Academic Info (per academic year) ────────────────────────────────

export const studentAcademicInfo = pgTable(
  'student_academic_info',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    school_id: varchar('school_id', { length: 36 })
      .notNull()
      .references(() => schools.id, { onDelete: 'cascade' }),
    student_id: varchar('student_id', { length: 36 })
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
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
    registration_number: varchar('registration_number', { length: 50 }),
    roll_number: varchar('roll_number', { length: 20 }),
    joining_date: date('joining_date'),
    is_current: boolean('is_current').default(false).notNull(),
    deleted: boolean('deleted').default(false).notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }),
  },
  (t) => ({
    idx_student: index('sai_student_id_idx').on(t.student_id),
    idx_student_current: index('sai_student_current_idx').on(t.student_id, t.is_current),
    idx_school_current: index('sai_school_current_idx').on(t.school_id, t.is_current),
    idx_class: index('sai_class_id_idx').on(t.class_id),
    idx_section: index('sai_section_id_idx').on(t.section_id),
  }),
);

// ─── Student Previous Academic Details ────────────────────────────────────────

export const studentPreviousAcademics = pgTable('student_previous_academics', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  student_id: varchar('student_id', { length: 36 })
    .notNull()
    .references(() => students.id, { onDelete: 'cascade' }),
  previous_school_name: varchar('previous_school_name', { length: 300 }),
  previous_class: varchar('previous_class', { length: 100 }),
  passing_year: varchar('passing_year', { length: 10 }),
  total_marks: varchar('total_marks', { length: 20 }),
  grade: varchar('grade', { length: 10 }),
  board: varchar('board', { length: 50 }),
  tc_number: varchar('tc_number', { length: 50 }),
  deleted: boolean('deleted').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
});

// ─── Student Address ──────────────────────────────────────────────────────────

export const studentAddresses = pgTable('student_addresses', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  student_id: varchar('student_id', { length: 36 })
    .notNull()
    .references(() => students.id, { onDelete: 'cascade' }),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  pincode: varchar('pincode', { length: 10 }),
  country: varchar('country', { length: 100 }).default('India'),
  deleted: boolean('deleted').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
});

// ─── Student Hostel Info ──────────────────────────────────────────────────────

export const studentHostelInfo = pgTable('student_hostel_info', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  student_id: varchar('student_id', { length: 36 })
    .notNull()
    .references(() => students.id, { onDelete: 'cascade' }),
  hostel_required: boolean('hostel_required').default(false).notNull(),
  hostel_name: varchar('hostel_name', { length: 150 }),
  room_number: varchar('room_number', { length: 20 }),
  deleted: boolean('deleted').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
});

// ─── Student Parents ──────────────────────────────────────────────────────────

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
  qualification: qualificationEnum('qualification'),
  annual_income: varchar('annual_income', { length: 50 }),
  aadhaar_number: varchar('aadhaar_number', { length: 12 }),
  profile_image: varchar('profile_image', { length: 500 }),
  is_primary: boolean('is_primary').default(false).notNull(),
  can_pickup: boolean('can_pickup').default(true).notNull(),
  password_hash: varchar('password_hash', { length: 255 }),
  must_change_password: boolean('must_change_password').default(false).notNull(),
  is_active: boolean('is_active').default(true).notNull(),
  last_login_at: timestamp('last_login_at', { withTimezone: true }),
  deleted: boolean('deleted').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
});

// ─── Student Documents ────────────────────────────────────────────────────────

export const studentDocuments = pgTable('student_documents', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  student_id: varchar('student_id', { length: 36 })
    .notNull()
    .references(() => students.id, { onDelete: 'cascade' }),
  document_name: documentTypeEnum('document_name').notNull(),
  file_type: documentFileTypeEnum('file_type').notNull(),
  document_link: varchar('document_link', { length: 500 }).notNull(),
  original_filename: varchar('original_filename', { length: 255 }),
  remarks: varchar('remarks', { length: 300 }),
  deleted: boolean('deleted').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
  uploaded_by: varchar('uploaded_by', { length: 36 }),
});

// ─── School Student Counter (for system_number generation) ───────────────────

export const schoolStudentCounters = pgTable('school_student_counters', {
  school_id: varchar('school_id', { length: 36 })
    .primaryKey()
    .references(() => schools.id, { onDelete: 'cascade' }),
  last_number: integer('last_number').default(0).notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
