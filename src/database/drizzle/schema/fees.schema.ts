import {
  pgTable,
  pgEnum,
  varchar,
  boolean,
  timestamp,
  date,
  numeric,
  jsonb,
  text,
  integer,
  unique,
} from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { students } from './students.schema';
import { academicYears } from './academic-years.schema';
import { classes } from './classes.schema';
import { financeHeads } from './finance-heads.schema';
import { financeAccounts } from './finance-accounts.schema';
import { financeIncome } from './finance-income.schema';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const feeCategoryEnum = pgEnum('fee_category', ['Class', 'Transport', 'Other']);
export const feeFrequencyEnum = pgEnum('fee_frequency', ['Monthly', 'Quarterly', 'Session', 'NA']);
export const feeBillStatusEnum = pgEnum('fee_bill_status', [
  'PENDING',
  'PARTIAL',
  'PAID',
  'OVERDUE',
  'WAIVED',
]);
export const paymentModeEnum = pgEnum('payment_mode', [
  'CASH',
  'ONLINE',
  'CHEQUE',
  'DD',
  'NEFT',
  'UPI',
]);
export const feePlanTypeEnum = pgEnum('fee_plan_type', ['Regular', 'PromotionFree', 'Admission']);

// ─── Fee Types ───────────────────────────────────────────────────────────────
// Defines what can be charged: Tuition, Transport, Hostel, etc.

export const feeTypes = pgTable('fee_types', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  fee_category: feeCategoryEnum('fee_category').notNull().default('Class'),
  frequency: feeFrequencyEnum('frequency').notNull().default('NA'),
  // e.g. ["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"]
  applicable_months: jsonb('applicable_months'),
  // Links to finance income head — required for finance auto-entry on payment
  income_head_id: varchar('income_head_id', { length: 36 }).references(() => financeHeads.id),
  is_active: boolean('is_active').notNull().default(true),
  deleted: boolean('deleted').notNull().default(false),
  created_by: varchar('created_by', { length: 36 }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
});

// ─── Fee Plans ────────────────────────────────────────────────────────────────
// 3 predefined plans per school: Regular, PromotionFree, Admission
// Seeded when school is created. Allow different fee amounts per plan.

export const feePlans = pgTable('fee_plans', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  plan_type: feePlanTypeEnum('plan_type').notNull(),
  description: text('description'),
  is_active: boolean('is_active').notNull().default(true),
  deleted: boolean('deleted').notNull().default(false),
  created_by: varchar('created_by', { length: 36 }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Class Fee Structures ─────────────────────────────────────────────────────
// Amount per: session × plan × class × fee_type
// One row = how much Class 1 Regular students pay for Tuition in 2025-26

export const feeClassStructures = pgTable(
  'fee_class_structures',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    school_id: varchar('school_id', { length: 36 })
      .notNull()
      .references(() => schools.id, { onDelete: 'cascade' }),
    academic_year_id: varchar('academic_year_id', { length: 36 })
      .notNull()
      .references(() => academicYears.id, { onDelete: 'cascade' }),
    fee_plan_id: varchar('fee_plan_id', { length: 36 })
      .notNull()
      .references(() => feePlans.id),
    class_id: varchar('class_id', { length: 36 })
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    fee_type_id: varchar('fee_type_id', { length: 36 })
      .notNull()
      .references(() => feeTypes.id),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    is_enabled: boolean('is_enabled').notNull().default(true),
    deleted: boolean('deleted').notNull().default(false),
    created_by: varchar('created_by', { length: 36 }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }),
  },
  (t) => ({
    uniq: unique().on(t.school_id, t.academic_year_id, t.fee_plan_id, t.class_id, t.fee_type_id),
  }),
);

// ─── Transport Routes ─────────────────────────────────────────────────────────
// Stub — expands when transport module is built (vehicles, stops, assignments)

export const transportRoutes = pgTable('transport_routes', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  is_active: boolean('is_active').notNull().default(true),
  deleted: boolean('deleted').notNull().default(false),
  created_by: varchar('created_by', { length: 36 }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Transport Route Fees ─────────────────────────────────────────────────────
// Amount per: session × route × transport fee_type

export const transportRouteFees = pgTable(
  'transport_route_fees',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    school_id: varchar('school_id', { length: 36 })
      .notNull()
      .references(() => schools.id, { onDelete: 'cascade' }),
    academic_year_id: varchar('academic_year_id', { length: 36 })
      .notNull()
      .references(() => academicYears.id, { onDelete: 'cascade' }),
    route_id: varchar('route_id', { length: 36 })
      .notNull()
      .references(() => transportRoutes.id, { onDelete: 'cascade' }),
    fee_type_id: varchar('fee_type_id', { length: 36 })
      .notNull()
      .references(() => feeTypes.id),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    is_enabled: boolean('is_enabled').notNull().default(true),
    deleted: boolean('deleted').notNull().default(false),
    created_by: varchar('created_by', { length: 36 }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniq: unique().on(t.school_id, t.academic_year_id, t.route_id, t.fee_type_id),
  }),
);

// ─── Fee Bills ────────────────────────────────────────────────────────────────
// One row per student × fee_type × month (or null for session fees)
// This is the ledger of what each student owes

export const feeBills = pgTable('fee_bills', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  student_id: varchar('student_id', { length: 36 })
    .notNull()
    .references(() => students.id, { onDelete: 'cascade' }),
  academic_year_id: varchar('academic_year_id', { length: 36 })
    .notNull()
    .references(() => academicYears.id, { onDelete: 'cascade' }),
  fee_type_id: varchar('fee_type_id', { length: 36 })
    .notNull()
    .references(() => feeTypes.id),
  fee_plan_id: varchar('fee_plan_id', { length: 36 }).references(() => feePlans.id),
  // "2026-04" for monthly fees; null for session fees
  bill_month: varchar('bill_month', { length: 7 }),
  due_date: date('due_date'),
  total_amount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
  discount_amount: numeric('discount_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  paid_amount: numeric('paid_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  late_fine_amount: numeric('late_fine_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  status: feeBillStatusEnum('status').notNull().default('PENDING'),
  is_manual: boolean('is_manual').notNull().default(false),
  notes: text('notes'),
  deleted: boolean('deleted').notNull().default(false),
  created_by: varchar('created_by', { length: 36 }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
});

// ─── Fee Bill Payments ────────────────────────────────────────────────────────
// Each payment transaction against a single bill

export const feeBillPayments = pgTable('fee_bill_payments', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  bill_id: varchar('bill_id', { length: 36 })
    .notNull()
    .references(() => feeBills.id, { onDelete: 'cascade' }),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  payment_mode: paymentModeEnum('payment_mode').notNull(),
  to_account_id: varchar('to_account_id', { length: 36 }).references(() => financeAccounts.id),
  transaction_id: varchar('transaction_id', { length: 100 }),
  bank_name: varchar('bank_name', { length: 100 }),
  payment_date: date('payment_date').notNull(),
  // Auto-created financeIncome entry when fee_type has income_head_id
  finance_income_id: varchar('finance_income_id', { length: 36 }).references(
    () => financeIncome.id,
  ),
  remarks: text('remarks'),
  created_by: varchar('created_by', { length: 36 }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Fee Discounts ────────────────────────────────────────────────────────────
// Irreversible audit log — once applied cannot be undone

export const feeDiscounts = pgTable('fee_discounts', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  student_id: varchar('student_id', { length: 36 })
    .notNull()
    .references(() => students.id, { onDelete: 'cascade' }),
  bill_id: varchar('bill_id', { length: 36 }).references(() => feeBills.id),
  fee_type_id: varchar('fee_type_id', { length: 36 })
    .notNull()
    .references(() => feeTypes.id),
  academic_year_id: varchar('academic_year_id', { length: 36 })
    .notNull()
    .references(() => academicYears.id),
  discount_amount: numeric('discount_amount', { precision: 12, scale: 2 }).notNull(),
  reason: text('reason'),
  applied_by: varchar('applied_by', { length: 36 }),
  applied_at: timestamp('applied_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Fee Late Rules ───────────────────────────────────────────────────────────

export const feeLateRules = pgTable('fee_late_rules', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  academic_year_id: varchar('academic_year_id', { length: 36 })
    .notNull()
    .references(() => academicYears.id),
  // Array of fee_type UUIDs this rule applies to
  applicable_fee_type_ids: jsonb('applicable_fee_type_ids').notNull(),
  // The fee_type used to record late fine (must be a valid fee_type id)
  late_fine_fee_type_id: varchar('late_fine_fee_type_id', { length: 36 }).references(
    () => feeTypes.id,
  ),
  late_fee_amount: numeric('late_fee_amount', { precision: 12, scale: 2 }).notNull(),
  days_after_due: integer('days_after_due').notNull().default(0),
  start_from_current_month: boolean('start_from_current_month').notNull().default(true),
  is_enabled: boolean('is_enabled').notNull().default(true),
  deleted: boolean('deleted').notNull().default(false),
  created_by: varchar('created_by', { length: 36 }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
