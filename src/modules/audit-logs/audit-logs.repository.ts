import { Injectable, Inject } from '@nestjs/common';
import { eq, and, desc, gte, lte, isNull, sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { auditLogs } from '../../database/drizzle/schema/audit-logs.schema';
import { v4 as uuid } from 'uuid';
import { AuditLogFilterDto } from './dto/audit-log-filter.dto';

export interface CreateAuditLogData {
  school_id: string | null;
  entity: (typeof auditLogs.$inferInsert)['entity'];
  entity_id: string;
  action: (typeof auditLogs.$inferInsert)['action'];
  changed_by?: string;
  ip_address?: string;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
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

  async findAll(schoolId: string | null, filters: AuditLogFilterDto) {
    const { entity, action, changed_by, from, to, page = 1, limit = 20 } = filters;
    const conditions = [schoolId ? eq(auditLogs.school_id, schoolId) : isNull(auditLogs.school_id)];
    if (entity) conditions.push(eq(auditLogs.entity, entity));
    if (action) conditions.push(eq(auditLogs.action, action));
    if (changed_by) conditions.push(eq(auditLogs.changed_by, changed_by));
    if (from) conditions.push(gte(auditLogs.changed_at, new Date(from)));
    if (to) conditions.push(lte(auditLogs.changed_at, new Date(to)));
    const where = and(...conditions);

    const [items, [{ count }]] = await Promise.all([
      this.db
        .select()
        .from(auditLogs)
        .where(where)
        .orderBy(desc(auditLogs.changed_at))
        .limit(limit)
        .offset((page - 1) * limit),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(auditLogs)
        .where(where),
    ]);

    return { items, total: Number(count) };
  }
}
