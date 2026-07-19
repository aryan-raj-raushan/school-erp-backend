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
import { addBillingCycle } from '../../subscriptions/utils/billing-cycle.utils';

const LOCK_KEY = 'cron_lock:subscription_expiry';
const LOCK_TTL = 300;

@Injectable()
export class SubscriptionExpiryTask {
  private readonly logger = new Logger(SubscriptionExpiryTask.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: DrizzleDB,
    private readonly redisService: RedisService,
    @InjectModel(NotificationLog.name)
    private readonly notificationLogModel: Model<NotificationLog>,
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

      const dueSubs = await this.db
        .select({
          id: subscriptions.id,
          school_id: subscriptions.school_id,
          end_date: subscriptions.end_date,
          plan_type: subscriptions.plan_type,
          auto_renew: subscriptions.auto_renew,
        })
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.status, SubscriptionStatus.ACTIVE),
            lt(subscriptions.end_date, new Date()),
          ),
        );

      if (dueSubs.length === 0) {
        this.logger.log('No subscriptions due');
        return;
      }

      const toRenew = dueSubs.filter((s) => s.auto_renew);
      const toExpire = dueSubs.filter((s) => !s.auto_renew);
      const now = new Date();

      // Auto-renew: keep the subscription ACTIVE and roll end_date forward one
      // billing cycle at a time until it's back in the future — this catches
      // it up correctly even if the cron missed a few cycles (e.g. downtime).
      for (const sub of toRenew) {
        let nextEndDate = sub.end_date as Date;
        while (nextEndDate < now) {
          nextEndDate = addBillingCycle(nextEndDate, sub.plan_type);
        }
        await this.db
          .update(subscriptions)
          .set({ end_date: nextEndDate, updated_at: now })
          .where(eq(subscriptions.id, sub.id));
      }

      if (toExpire.length > 0) {
        const expireIds = toExpire.map((s) => s.id);
        await this.db
          .update(subscriptions)
          .set({ status: SubscriptionStatus.EXPIRED, updated_at: now })
          .where(inArray(subscriptions.id, expireIds));
      }

      const schoolIds = [...new Set(dueSubs.map((s) => s.school_id))];

      await Promise.all(
        schoolIds.map((schoolId) => this.redisService.del(`subscription_status:${schoolId}`)),
      );

      const notificationDocs = [
        ...toRenew.map((sub) => ({
          school_id: sub.school_id,
          subscription_id: sub.id,
          type: 'SUBSCRIPTION_RENEWED',
          channel: 'SYSTEM',
          status: 'PENDING',
          payload: { message: `Subscription ${sub.id} auto-renewed` },
          created_at: now,
        })),
        ...toExpire.map((sub) => ({
          school_id: sub.school_id,
          subscription_id: sub.id,
          type: 'SUBSCRIPTION_EXPIRED',
          channel: 'SYSTEM',
          status: 'PENDING',
          payload: { message: `Subscription ${sub.id} expired` },
          created_at: now,
        })),
      ];

      await this.notificationLogModel.insertMany(notificationDocs);

      this.logger.log(
        `Renewed ${toRenew.length}, expired ${toExpire.length} subscription(s) for ${schoolIds.length} school(s)`,
      );
    } catch (error) {
      this.logger.error('Subscription expiry job failed', error);
    } finally {
      await this.redisService.del(LOCK_KEY);
    }
  }
}
