import { pgTable, pgEnum, varchar, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { schools } from './schools.schema';

export const auditEntityEnum = pgEnum('audit_entity', [
  'ATTENDANCE',
  'LEAVE',
  'HOLIDAY',
  'TIMING',
  'SETTINGS',
  'GATE_PASS',
  'EARLY_EXIT',
  'USER',
  'EXAM',
  'EXAM_SCHEDULE',
  'EXAM_SITTING_PLAN',
]);

export const auditActionEnum = pgEnum('audit_action', [
  'CREATE',
  'UPDATE',
  'DELETE',
  'STATUS_CHANGE',
  'PUBLISH',
  'DOWNLOAD',
]);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    school_id: varchar('school_id', { length: 36 }).references(() => schools.id, {
      onDelete: 'cascade',
    }),
    entity: auditEntityEnum('entity').notNull(),
    entity_id: varchar('entity_id', { length: 36 }).notNull(),
    action: auditActionEnum('action').notNull(),
    changed_by: varchar('changed_by', { length: 36 }),
    changed_at: timestamp('changed_at', { withTimezone: true }).defaultNow().notNull(),
    ip_address: varchar('ip_address', { length: 64 }),
    old_value: jsonb('old_value'),
    new_value: jsonb('new_value'),
  },
  (t) => ({
    idx_school: index('audit_logs_school_idx').on(t.school_id),
    idx_entity: index('audit_logs_entity_idx').on(t.entity, t.entity_id),
    idx_changed_at: index('audit_logs_changed_at_idx').on(t.changed_at),
  }),
);
