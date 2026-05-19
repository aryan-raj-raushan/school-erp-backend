import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Inject } from '@nestjs/common';
import { lt, eq, and, inArray } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../../database/drizzle/drizzle.provider';
import { subscriptions } from '../../../database/drizzle/schema/subscriptions.schema';
import { RedisService } from '../../redis/redis.service';
import { NotificationLog } from '../../../database/mongo/schemas/notification-log.schema';
import { SubscriptionStatus } from '../../../shared/enums';

const LOCK_KEY = 'cron_lock:subscription_expiry';
const LOCK_TTL = 300;

@Injectable()
export class SubscriptionExpiryTask {
  private readonly logger = new Logger(SubscriptionExpiryTask.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: DrizzleDB,
    private readonly redisService: RedisService,
    @InjectModel(NotificationLog.name) private readonly notificationLogModel: Model<NotificationLog>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleSubscriptionExpiry(): Promise<void> {
    const acquired = await this.redisService.setnx(LOCK_KEY, 'locked');
    if (acquired) {
      await this.redisService.expire(LOCK_KEY, LOCK_TTL);
    }
    if (!acquired) {
      this.logger.log('Subscription expiry cron already running on another instance. Skipping.');
      return;
    }

    try {
      this.logger.log('Starting subscription expiry job');

      const expired = await this.db
        .select({ id: subscriptions.id, school_id: subscriptions.school_id })
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.status, SubscriptionStatus.ACTIVE),
            lt(subscriptions.end_date, new Date().toISOString().split('T')[0]),
          ),
        );

      if (expired.length === 0) {
        this.logger.log('No subscriptions to expire');
        return;
      }

      const ids = expired.map((s) => s.id);

      await this.db
        .update(subscriptions)
        .set({ status: SubscriptionStatus.EXPIRED, updated_at: new Date() })
        .where(inArray(subscriptions.id, ids));

      const schoolIds = [...new Set(expired.map((s) => s.school_id))];

      await Promise.all(
        schoolIds.map((schoolId) =>
          this.redisService.del(`subscription_status:${schoolId}`),
        ),
      );

      const notificationDocs = expired.map((sub) => ({
        school_id: sub.school_id,
        subscription_id: sub.id,
        type: 'SUBSCRIPTION_EXPIRED',
        channel: 'SYSTEM',
        status: 'PENDING',
        payload: { message: `Subscription ${sub.id} expired` },
        created_at: new Date(),
      }));

      await this.notificationLogModel.insertMany(notificationDocs);

      this.logger.log(`Expired ${expired.length} subscription(s) for ${schoolIds.length} school(s)`);
    } catch (error) {
      this.logger.error('Subscription expiry job failed', error);
    } finally {
      await this.redisService.del(LOCK_KEY);
    }
  }
}
