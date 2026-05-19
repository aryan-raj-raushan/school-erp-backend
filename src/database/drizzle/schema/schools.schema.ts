import {
  pgTable,
  varchar,
  text,
  boolean,
  timestamp,
  decimal,
  pgEnum,
} from 'drizzle-orm/pg-core';

export const boardTypeEnum = pgEnum('board_type', ['CBSE', 'ICSE', 'STATE', 'IB', 'IGCSE']);
export const markingSystemEnum = pgEnum('marking_system', ['MARKS', 'GRADES', 'CGPA']);

export const schools = pgTable('schools', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 150 }).notNull(),
  code: varchar('code', { length: 10 }),
  contact_number: varchar('contact_number', { length: 15 }),
  dial_code: varchar('dial_code', { length: 10 }).default('+91'),
  email: varchar('email', { length: 100 }),
  website: varchar('website', { length: 300 }),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  country: varchar('country', { length: 100 }).default('India'),
  pincode: varchar('pincode', { length: 10 }),
  logo_url: text('logo_url'),
  board_type: boardTypeEnum('board_type'),
  marking_system: markingSystemEnum('marking_system'),
  lat: decimal('lat', { precision: 10, scale: 7 }),
  lng: decimal('lng', { precision: 10, scale: 7 }),
  is_active: boolean('is_active').default(true).notNull(),
  deleted: boolean('deleted').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
  created_by: varchar('created_by', { length: 36 }),
});
