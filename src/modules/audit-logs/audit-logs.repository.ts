import { Injectable, Inject } from '@nestjs/common';
import { eq, and, desc, gte, lte } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { auditLogs } from '../../database/drizzle/schema/audit-logs.schema';
import { v4 as uuid } from 'uuid';

export interface CreateAuditLogData {
  school_id: string;
  entity: typeof auditLogs.$inferInsert['entity'];
  entity_id: string;
  action: typeof auditLogs.$inferInsert['action'];
  changed_by?: string;
  ip_address?: string;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
}

export interface AuditLogFilters {
  entity?: typeof auditLogs.$inferInsert['entity'];
  action?: typeof auditLogs.$inferInsert['action'];
  changed_by?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AuditLogsRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  async create(data: CreateAuditLogData) {
    const [row] = await this.db
      .insert(auditLogs)
      .values({ id: uuid(), ...data })
      .returning();
    return row;
  }

  async findAll(schoolId: string, filters: AuditLogFilters = {}) {
    const { entity, action, from, to, page = 1, limit = 50 } = filters;
    const conditions = [eq(auditLogs.school_id, schoolId)];
    if (entity) conditions.push(eq(auditLogs.entity, entity));
    if (action) conditions.push(eq(auditLogs.action, action));
    if (from) conditions.push(gte(auditLogs.changed_at, new Date(from)));
    if (to) conditions.push(lte(auditLogs.changed_at, new Date(to)));

    const items = await this.db
      .select()
      .from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.changed_at))
      .limit(limit)
      .offset((page - 1) * limit);

    return items;
  }
}
