import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { APP_EVENTS } from '../../../shared/events/event-names';
import { InvoicesService } from '../invoices.service';
import { SubscriptionAssignedEvent } from '../../subscriptions/events/subscription.events';

@Injectable()
export class SubscriptionAssignedListener {
  private readonly logger = new Logger(SubscriptionAssignedListener.name);

  constructor(private readonly invoicesService: InvoicesService) {}

  // Bills any one-time charges already attached to this school (e.g. RFID or
  // setup fees added as part of assigning the subscription) right away — the
  // recurring subscription line is billed later, in arrears, by the cron.
  @OnEvent(APP_EVENTS.BILLING.SUBSCRIPTION_ASSIGNED)
  async handleSubscriptionAssigned(payload: SubscriptionAssignedEvent): Promise<void> {
    try {
      await this.invoicesService.generateOneTimeChargesInvoice(
        payload.schoolId,
        payload.subscriptionId,
      );
    } catch (error) {
      this.logger.error(`Failed to bill one-time charges for school ${payload.schoolId}`, error);
    }
  }
}
