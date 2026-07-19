import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { lte, eq, and } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../../database/drizzle/drizzle.provider';
import { subscriptions } from '../../../database/drizzle/schema/subscriptions.schema';
import { RedisService } from '../../redis/redis.service';
import { InvoicesService } from '../../invoices/invoices.service';
import { InvoicesRepository } from '../../invoices/invoices.repository';
import { SubscriptionStatus } from '../../../shared/enums';

const GENERATE_LOCK_KEY = 'cron_lock:invoice_generation';
const OVERDUE_LOCK_KEY = 'cron_lock:invoice_overdue';
const LOCK_TTL = 300;

@Injectable()
export class InvoiceGenerationTask {
  private readonly logger = new Logger(InvoiceGenerationTask.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: DrizzleDB,
    private readonly redisService: RedisService,
    private readonly invoicesService: InvoicesService,
    private readonly invoicesRepo: InvoicesRepository,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handleRecurringInvoices(): Promise<void> {
    const acquired = await this.redisService.setnx(GENERATE_LOCK_KEY, 'locked');
    if (acquired) await this.redisService.expire(GENERATE_LOCK_KEY, LOCK_TTL);
    if (!acquired) {
      this.logger.log('Invoice generation cron already running on another instance. Skipping.');
      return;
    }

    try {
      this.logger.log('Starting recurring invoice generation job');

      const due = await this.db
        .select({ id: subscriptions.id })
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.status, SubscriptionStatus.ACTIVE),
            lte(subscriptions.next_billing_date, new Date()),
          ),
        );

      for (const sub of due) {
        try {
          await this.invoicesService.generateForSubscription(sub.id);
        } catch (error) {
          this.logger.error(`Failed to generate invoice for subscription ${sub.id}`, error);
        }
      }

      this.logger.log(`Generated invoices for ${due.length} subscription(s)`);
    } catch (error) {
      this.logger.error('Recurring invoice generation job failed', error);
    } finally {
      await this.redisService.del(GENERATE_LOCK_KEY);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleOverdueInvoices(): Promise<void> {
    const acquired = await this.redisService.setnx(OVERDUE_LOCK_KEY, 'locked');
    if (acquired) await this.redisService.expire(OVERDUE_LOCK_KEY, LOCK_TTL);
    if (!acquired) {
      this.logger.log('Invoice overdue cron already running on another instance. Skipping.');
      return;
    }

    try {
      const candidates = await this.invoicesRepo.findOverdueCandidates();
      if (candidates.length === 0) return;
      await this.invoicesRepo.markOverdue(candidates.map((c) => c.id));
      this.logger.log(`Marked ${candidates.length} invoice(s) OVERDUE`);
    } catch (error) {
      this.logger.error('Invoice overdue job failed', error);
    } finally {
      await this.redisService.del(OVERDUE_LOCK_KEY);
    }
  }
}
