import {
  pgTable,
  pgEnum,
  varchar,
  boolean,
  timestamp,
  integer,
  time,
  unique,
} from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { classes } from './classes.schema';

export const timingTypeEnum = pgEnum('timing_type', [
  'SUMMER',
  'WINTER',
  'EXAM',
  'SATURDAY',
  'RAMADAN',
  'SPECIAL',
  'DEFAULT',
]);

export const attendanceMethodEnum = pgEnum('attendance_method', [
  'MANUAL',
  'RFID',
  'BOTH',
  'BIOMETRIC',
  'QR',
]);

export const conflictResolutionEnum = pgEnum('conflict_resolution_mode', [
  'MANUAL_WINS',
  'RFID_WINS',
  'FLAG_FOR_REVIEW',
]);

// Per-school attendance configuration
export const schoolSettings = pgTable('school_settings', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .unique()
    .references(() => schools.id, { onDelete: 'cascade' }),
  attendance_method: attendanceMethodEnum('attendance_method').default('BOTH').notNull(),
  attendance_lock_hours: integer('attendance_lock_hours').default(24).notNull(),
  three_lates_equal_half_day: boolean('three_lates_equal_half_day').default(true).notNull(),
  two_half_days_equal_leave: boolean('two_half_days_equal_leave').default(false).notNull(),
  auto_notify_parent_on_absent: boolean('auto_notify_parent_on_absent').default(false).notNull(),
  conflict_resolution_mode: conflictResolutionEnum('conflict_resolution_mode').default('FLAG_FOR_REVIEW').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
});

// Multiple timing schedules per school (Summer, Winter, Exam, etc.)
export const schoolTimings = pgTable('school_timings', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  timing_type: timingTypeEnum('timing_type').notNull(),
  school_start_time: time('school_start_time').notNull(),
  school_end_time: time('school_end_time').notNull(),
  grace_period_minutes: integer('grace_period_minutes').default(10).notNull(),
  late_cutoff_time: time('late_cutoff_time'),
  half_day_cutoff_time: time('half_day_cutoff_time'),
  absent_cutoff_time: time('absent_cutoff_time'),
  working_days: varchar('working_days', { length: 100 }).default('MON,TUE,WED,THU,FRI').notNull(),
  effective_from: varchar('effective_from', { length: 10 }).notNull(),
  effective_to: varchar('effective_to', { length: 10 }).notNull(),
  priority: integer('priority').default(0).notNull(),
  is_active: boolean('is_active').default(true).notNull(),
  deleted: boolean('deleted').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
});

// Override default school timing per class
export const classTimingOverrides = pgTable(
  'class_timing_overrides',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    school_id: varchar('school_id', { length: 36 })
      .notNull()
      .references(() => schools.id, { onDelete: 'cascade' }),
    class_id: varchar('class_id', { length: 36 })
      .notNull()
      .references(() => classes.id, { onDelete: 'cascade' }),
    timing_id: varchar('timing_id', { length: 36 })
      .references(() => schoolTimings.id, { onDelete: 'set null' }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniqueClassSchool: unique('class_timing_overrides_class_school_unique').on(t.class_id, t.school_id),
  }),
);
