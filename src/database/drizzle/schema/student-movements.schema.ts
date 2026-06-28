import { pgTable, pgEnum, varchar, date, timestamp } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';
import { students } from './students.schema';

export const movementLocationEnum = pgEnum('movement_location', [
  'CAMPUS',
  'LIBRARY',
  'MEDICAL_ROOM',
  'SPORTS',
  'CANTEEN',
  'GATE',
  'HOSTEL',
  'LAB',
]);

export const studentMovements = pgTable('student_movements', {
  id: varchar('id', { length: 36 }).primaryKey(),
  school_id: varchar('school_id', { length: 36 })
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  student_id: varchar('student_id', { length: 36 })
    .notNull()
    .references(() => students.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  tapped_at: timestamp('tapped_at', { withTimezone: true }).notNull(),
  location: movementLocationEnum('location').notNull(),
  device_id: varchar('device_id', { length: 100 }),
});
