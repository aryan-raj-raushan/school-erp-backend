import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { notificationRules } from '../../database/drizzle/schema/notification-rules.schema';
import { eq, and } from 'drizzle-orm';
import { generateId } from '../../utils/uuid.utils';
import { UpsertNotificationRuleDto } from './dto/upsert-notification-rule.dto';

@Injectable()
export class NotificationRulesService {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  async findAll(schoolId: string) {
    return this.db
      .select()
      .from(notificationRules)
      .where(eq(notificationRules.school_id, schoolId));
  }

  async upsert(schoolId: string, dto: UpsertNotificationRuleDto) {
    const values = {
      notify_parent: dto.notify_parent,
      notify_student: dto.notify_student,
      notify_teacher: dto.notify_teacher,
      channel: dto.channel,
      delay_minutes: dto.delay_minutes,
      is_active: dto.is_active,
    };
    const existing = await this.db
      .select()
      .from(notificationRules)
      .where(
        and(
          eq(notificationRules.school_id, schoolId),
          eq(notificationRules.event_type, dto.event_type),
        ),
      )
      .limit(1);

    if (existing[0]) {
      const [row] = await this.db
        .update(notificationRules)
        .set({ ...values, updated_at: new Date() })
        .where(
          and(
            eq(notificationRules.school_id, schoolId),
            eq(notificationRules.event_type, dto.event_type),
          ),
        )
        .returning();
      return row;
    }

    const [row] = await this.db
      .insert(notificationRules)
      .values({ id: generateId(), school_id: schoolId, event_type: dto.event_type, ...values })
      .returning();
    return row;
  }
}
