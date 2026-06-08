import { pgTable, pgEnum, varchar, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { academicYears } from './academic-years.schema';
import { classes } from './classes.schema';
import { classDetails } from './class-details.schema';
import { subjects } from './subjects.schema';
import { schoolUsers } from './school-users.schema';

export const dayOfWeekEnum = pgEnum('day_of_week', [
  'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY',
]);

export const timetables = pgTable('timetables', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 }).notNull().references(() => schools.id, { onDelete: 'cascade' }),
  academic_year_id: varchar('academic_year_id', { length: 36 }).references(() => academicYears.id, { onDelete: 'set null' }),
  class_id: varchar('class_id', { length: 36 }).references(() => classes.id, { onDelete: 'set null' }),
  class_detail_id: varchar('class_detail_id', { length: 36 }).references(() => classDetails.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 100 }).notNull().default('DEFAULT'),
  max_periods: integer('max_periods').notNull().default(8),
  is_complete: boolean('is_complete').notNull().default(false),
  deleted: boolean('deleted').notNull().default(false),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
});

export const timetablePeriodTimes = pgTable('timetable_period_times', {
  id: varchar('id', { length: 36 }).primaryKey(),
  timetable_id: varchar('timetable_id', { length: 36 }).notNull().references(() => timetables.id, { onDelete: 'cascade' }),
  period_number: integer('period_number').notNull(),
  start_time: varchar('start_time', { length: 10 }).notNull(),
  end_time: varchar('end_time', { length: 10 }).notNull(),
});

export const timetableEntries = pgTable('timetable_entries', {
  id: varchar('id', { length: 36 }).primaryKey(),
  timetable_id: varchar('timetable_id', { length: 36 }).notNull().references(() => timetables.id, { onDelete: 'cascade' }),
  school_id: varchar('school_id', { length: 36 }).notNull().references(() => schools.id, { onDelete: 'cascade' }),
  day_of_week: dayOfWeekEnum('day_of_week').notNull(),
  period_number: integer('period_number').notNull(),
  subject_id: varchar('subject_id', { length: 36 }).references(() => subjects.id, { onDelete: 'set null' }),
  teacher_id: varchar('teacher_id', { length: 36 }).references(() => schoolUsers.id, { onDelete: 'set null' }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const timetableClassTeachers = pgTable('timetable_class_teachers', {
  id: varchar('id', { length: 36 }).primaryKey(),
  timetable_id: varchar('timetable_id', { length: 36 }).notNull().references(() => timetables.id, { onDelete: 'cascade' }),
  school_id: varchar('school_id', { length: 36 }).notNull().references(() => schools.id, { onDelete: 'cascade' }),
  teacher_id: varchar('teacher_id', { length: 36 }).notNull().references(() => schoolUsers.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
