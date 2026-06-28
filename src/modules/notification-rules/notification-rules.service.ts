import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { notificationRules } from '../../database/drizzle/schema/notification-rules.schema';
import { eq, and } from 'drizzle-orm';
import { generateId } from '../../utils/uuid.utils';

export type UpsertNotificationRuleDto = {
  event_type: typeof notificationRules.$inferInsert['event_type'];
  notify_parent?: boolean;
  notify_student?: boolean;
  notify_teacher?: boolean;
  channel?: typeof notificationRules.$inferInsert['channel'];
  delay_minutes?: number;
  is_active?: boolean;
};

@Injectable()
export class NotificationRulesService {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  async findAll(schoolId: string) {
    return this.db.select().from(notificationRules).where(eq(notificationRules.school_id, schoolId));
  }

  async upsert(schoolId: string, dto: UpsertNotificationRuleDto) {
    const existing = await this.db
      .select()
      .from(notificationRules)
      .where(and(eq(notificationRules.school_id, schoolId), eq(notificationRules.event_type, dto.event_type)))
      .limit(1);

    if (existing[0]) {
      const [row] = await this.db
        .update(notificationRules)
        .set({ ...dto, updated_at: new Date() })
        .where(and(eq(notificationRules.school_id, schoolId), eq(notificationRules.event_type, dto.event_type)))
        .returning();
      return row;
    }

    const [row] = await this.db
      .insert(notificationRules)
      .values({ id: generateId(), school_id: schoolId, ...dto })
      .returning();
    return row;
  }
}
