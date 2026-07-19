import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { eq, inArray } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../../database/drizzle/drizzle.provider';
import { invoices } from '../../../database/drizzle/schema/invoices.schema';
import { subscriptions } from '../../../database/drizzle/schema/subscriptions.schema';
import { schools } from '../../../database/drizzle/schema/schools.schema';
import { RedisService } from '../../redis/redis.service';
import { APP_EVENTS } from '../../../shared/events/event-names';

const LOCK_KEY = 'cron_lock:restriction_enforcement';
const LOCK_TTL = 300;

const SEVERITY: Record<string, number> = { NONE: 0, SOFT: 1, PARTIAL: 2, COMPLETE: 3 };

@Injectable()
export class RestrictionEnforcementTask {
  private readonly logger = new Logger(RestrictionEnforcementTask.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: DrizzleDB,
    private readonly redisService: RedisService,
    private readonly events: EventEmitter2,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleRestrictionEnforcement(): Promise<void> {
    const acquired = await this.redisService.setnx(LOCK_KEY, 'locked');
    if (acquired) await this.redisService.expire(LOCK_KEY, LOCK_TTL);
    if (!acquired) {
      this.logger.log(
        'Restriction enforcement cron already running on another instance. Skipping.',
      );
      return;
    }

    try {
      // Source 1: unpaid invoices whose due date + grace period has passed —
      // the day-to-day "pay your bill on time" trigger.
      const invoiceRows = await this.db
        .select({
          schoolId: invoices.school_id,
          dueDate: invoices.due_date,
          graceDays: subscriptions.grace_period_days,
          restrictionMode: subscriptions.restriction_mode,
        })
        .from(invoices)
        .innerJoin(subscriptions, eq(invoices.subscription_id, subscriptions.id))
        .where(inArray(invoices.status, ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE']));

      // Source 2: subscriptions that lapsed (end_date passed, not auto-renewed
      // — SubscriptionExpiryTask already flipped these to EXPIRED) whose grace
      // period has also passed. Catches a school that stops renewing even if
      // every invoice it was ever issued happened to be paid on time.
      const lapsedSubs = await this.db
        .select({
          schoolId: subscriptions.school_id,
          endDate: subscriptions.end_date,
          graceDays: subscriptions.grace_period_days,
          restrictionMode: subscriptions.restriction_mode,
        })
        .from(subscriptions)
        .where(eq(subscriptions.status, 'EXPIRED'));

      const now = Date.now();
      const neededBySchool = new Map<string, { mode: string; reason: string }>();

      const consider = (
        schoolId: string,
        anchorDate: Date | null,
        graceDays: number | null,
        restrictionMode: string | null,
        reason: string,
      ) => {
        if (!anchorDate || !restrictionMode || restrictionMode === 'NONE') return;
        const graceMs = (graceDays ?? 0) * 24 * 60 * 60 * 1000;
        if (anchorDate.getTime() + graceMs > now) return; // still within grace period

        const current = neededBySchool.get(schoolId);
        if (!current || SEVERITY[restrictionMode] > SEVERITY[current.mode]) {
          neededBySchool.set(schoolId, { mode: restrictionMode, reason });
        }
      };

      for (const row of invoiceRows) {
        consider(
          row.schoolId,
          row.dueDate,
          row.graceDays,
          row.restrictionMode,
          'Overdue invoice(s) past grace period',
        );
      }
      for (const row of lapsedSubs) {
        consider(
          row.schoolId,
          row.endDate,
          row.graceDays,
          row.restrictionMode,
          'Subscription lapsed past grace period',
        );
      }

      let appliedCount = 0;
      for (const [schoolId, { mode, reason }] of neededBySchool) {
        const [school] = await this.db
          .select({ restriction_level: schools.restriction_level })
          .from(schools)
          .where(eq(schools.id, schoolId));
        if (school?.restriction_level === mode) continue;

        await this.db
          .update(schools)
          .set({
            restriction_level: mode as 'SOFT' | 'PARTIAL' | 'COMPLETE',
            restriction_applied_at: new Date(),
            restriction_reason: reason,
            updated_at: new Date(),
          })
          .where(eq(schools.id, schoolId));

        await this.redisService.del(`school_restriction:${schoolId}`);
        this.events.emit(APP_EVENTS.SCHOOL_RESTRICTION.APPLIED, { schoolId, level: mode });
        appliedCount++;
      }

      this.logger.log(`Restriction applied/updated for ${appliedCount} school(s)`);
    } catch (error) {
      this.logger.error('Restriction enforcement job failed', error);
    } finally {
      await this.redisService.del(LOCK_KEY);
    }
  }
}
