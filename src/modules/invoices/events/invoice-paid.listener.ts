import { Injectable, Logger } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { InvoicesRepository } from '../invoices.repository';
import { SchoolsRepository } from '../../schools/schools.repository';
import { SubscriptionsRepository } from '../../subscriptions/subscriptions.repository';
import { RedisService } from '../../redis/redis.service';
import { APP_EVENTS } from '../../../shared/events/event-names';
import { InvoicePaidEvent } from './invoice.events';

@Injectable()
export class InvoicePaidListener {
  private readonly logger = new Logger(InvoicePaidListener.name);

  constructor(
    private readonly invoicesRepo: InvoicesRepository,
    private readonly schoolsRepo: SchoolsRepository,
    private readonly subscriptionsRepo: SubscriptionsRepository,
    private readonly redisService: RedisService,
    private readonly events: EventEmitter2,
  ) {}

  // Lifts a school's restriction once it has no other OVERDUE invoices left
  // and no lapsed (expired, ungraced) subscription — set by
  // RestrictionEnforcementTask, cleared here rather than the listener
  // re-deriving grace periods itself.
  @OnEvent(APP_EVENTS.BILLING.INVOICE_PAID)
  async handleInvoicePaid(payload: InvoicePaidEvent): Promise<void> {
    try {
      const stillOverdue = await this.invoicesRepo.hasOverdueInvoices(payload.schoolId);
      if (stillOverdue) return;

      const stillLapsed = await this.subscriptionsRepo.hasLapsedSubscription(payload.schoolId);
      if (stillLapsed) return;

      await this.schoolsRepo.clearRestriction(payload.schoolId);
      await this.redisService.del(`school_restriction:${payload.schoolId}`);

      this.events.emit(APP_EVENTS.SCHOOL_RESTRICTION.LIFTED, { schoolId: payload.schoolId });
    } catch (error) {
      this.logger.error(`Failed to lift restriction for school ${payload.schoolId}`, error);
    }
  }
}
