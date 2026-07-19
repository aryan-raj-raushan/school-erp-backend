import { Injectable, Logger } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { InvoicesRepository } from '../invoices.repository';
import { APP_EVENTS } from '../../../shared/events/event-names';
import { PaymentApprovedEvent } from './payment.events';
import { InvoicePaidEvent } from './invoice.events';

@Injectable()
export class PaymentApprovedListener {
  private readonly logger = new Logger(PaymentApprovedListener.name);

  constructor(
    private readonly invoicesRepo: InvoicesRepository,
    private readonly events: EventEmitter2,
  ) {}

  @OnEvent(APP_EVENTS.BILLING.PAYMENT_APPROVED)
  async handlePaymentApproved(payload: PaymentApprovedEvent): Promise<void> {
    try {
      const invoice = await this.invoicesRepo.findById(payload.invoiceId);
      if (!invoice) return;

      const newAmountPaid = Number(invoice.amount_paid) + Number(payload.amount);
      const total = Number(invoice.total_amount);
      const status = newAmountPaid >= total ? 'PAID' : 'PARTIALLY_PAID';

      await this.invoicesRepo.updatePaymentState(invoice.id, {
        amount_paid: String(newAmountPaid),
        status,
        paid_at: status === 'PAID' ? new Date() : undefined,
      });

      if (status === 'PAID') {
        await this.events.emitAsync(APP_EVENTS.BILLING.INVOICE_PAID, {
          invoiceId: invoice.id,
          schoolId: invoice.school_id,
        } satisfies InvoicePaidEvent);
      }
    } catch (error) {
      this.logger.error(
        `Failed to reconcile invoice ${payload.invoiceId} after payment approval`,
        error,
      );
    }
  }
}
