import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentsRepository } from './payments.repository';
import { InvoicesRepository } from './invoices.repository';
import { RazorpayService, RazorpayOrder } from '../../shared/services/razorpay.service';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { SubmitPaymentDto } from './dto/submit-payment.dto';
import { RejectPaymentDto } from './dto/reject-payment.dto';
import { InvoicePayment } from './types/payment.types';
import { CompanyRole, PaymentMethod } from '../../shared/enums';
import { CacheTTL } from '../../shared/constants';
import { APP_EVENTS } from '../../shared/events/event-names';
import {
  PaymentSubmittedEvent,
  PaymentApprovedEvent,
  PaymentRejectedEvent,
} from './events/payment.events';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly paymentsRepo: PaymentsRepository,
    private readonly invoicesRepo: InvoicesRepository,
    private readonly razorpayService: RazorpayService,
    private readonly redisService: RedisService,
    private readonly events: EventEmitter2,
  ) {}

  // Same shape as InvoicesService's helper — see that file for why OPERATOR is unrestricted too.
  private async getPermittedSchoolIds(userId: string, role: string): Promise<string[] | null> {
    if (role === CompanyRole.SUPER_ADMIN || role === CompanyRole.OPERATOR) return null;

    const key = `company_user:${userId}:schools`;
    let ids = await this.redisService.smembers(key);
    if (ids.length === 0) {
      ids = await this.invoicesRepo.findSchoolIdsByCompanyUserId(userId);
      if (ids.length > 0) {
        await this.redisService.sadd(key, ...ids);
        await this.redisService.expire(key, CacheTTL.HOUR);
      }
    }
    return ids;
  }

  private async assertPaymentAccess(
    payment: InvoicePayment,
    userId: string,
    role: string,
  ): Promise<void> {
    const permitted = await this.getPermittedSchoolIds(userId, role);
    if (permitted !== null && !permitted.includes(payment.school_id)) {
      throw new ForbiddenException('Access denied to this payment');
    }
  }

  async findByInvoice(invoiceId: string): Promise<InvoicePayment[]> {
    return this.paymentsRepo.findByInvoiceId(invoiceId);
  }

  async findPendingVerification(userId: string, role: string): Promise<InvoicePayment[]> {
    const permitted = await this.getPermittedSchoolIds(userId, role);
    if (permitted !== null && permitted.length === 0) return [];
    return this.paymentsRepo.findPendingVerification(permitted ?? undefined);
  }

  async submitPayment(
    invoiceId: string,
    schoolId: string,
    dto: SubmitPaymentDto,
    createdBy: string,
  ): Promise<InvoicePayment> {
    if (dto.payment_method === PaymentMethod.RAZORPAY) {
      throw new BadRequestException('Use the Razorpay order endpoint for online payments');
    }

    const invoice = await this.invoicesRepo.findById(invoiceId);
    if (!invoice) throw new NotFoundException(`Invoice '${invoiceId}' not found`);
    if (invoice.school_id !== schoolId)
      throw new ForbiddenException('Access denied to this invoice');
    if (invoice.status === 'PAID' || invoice.status === 'VOID') {
      throw new BadRequestException(`Cannot submit a payment against a ${invoice.status} invoice`);
    }

    const payment = await this.paymentsRepo.create({
      id: generateId(),
      school_id: schoolId,
      subscription_id: invoice.subscription_id,
      invoice_id: invoice.id,
      amount: String(dto.amount),
      status: 'PENDING_VERIFICATION',
      payment_method: dto.payment_method,
      proof_url: dto.proof_url,
      proof_s3_key: dto.proof_s3_key,
      notes: dto.notes,
      is_manual: true,
      created_by: createdBy,
    });

    this.events.emit(APP_EVENTS.BILLING.PAYMENT_SUBMITTED, {
      paymentId: payment.id,
      invoiceId: invoice.id,
      schoolId,
    } satisfies PaymentSubmittedEvent);

    return payment;
  }

  async approvePayment(paymentId: string, userId: string, role: string): Promise<InvoicePayment> {
    const payment = await this.paymentsRepo.findById(paymentId);
    if (!payment) throw new NotFoundException(`Payment '${paymentId}' not found`);
    await this.assertPaymentAccess(payment, userId, role);
    if (payment.status !== 'PENDING_VERIFICATION') {
      throw new BadRequestException(`Payment is already '${payment.status}'`);
    }
    if (!payment.invoice_id) throw new BadRequestException('Payment is not linked to an invoice');

    const updated = await this.paymentsRepo.update(paymentId, {
      status: 'SUCCESS',
      verified_by: userId,
      approved_at: new Date(),
      paid_at: new Date(),
    });

    await this.events.emitAsync(APP_EVENTS.BILLING.PAYMENT_APPROVED, {
      paymentId: updated.id,
      invoiceId: payment.invoice_id,
      schoolId: payment.school_id,
      amount: updated.amount,
    } satisfies PaymentApprovedEvent);

    return updated;
  }

  async rejectPayment(
    paymentId: string,
    dto: RejectPaymentDto,
    userId: string,
    role: string,
  ): Promise<InvoicePayment> {
    const payment = await this.paymentsRepo.findById(paymentId);
    if (!payment) throw new NotFoundException(`Payment '${paymentId}' not found`);
    await this.assertPaymentAccess(payment, userId, role);
    if (payment.status !== 'PENDING_VERIFICATION') {
      throw new BadRequestException(`Payment is already '${payment.status}'`);
    }
    if (!payment.invoice_id) throw new BadRequestException('Payment is not linked to an invoice');

    const updated = await this.paymentsRepo.update(paymentId, {
      status: 'FAILED',
      verified_by: userId,
      rejected_reason: dto.reason,
    });

    this.events.emit(APP_EVENTS.BILLING.PAYMENT_REJECTED, {
      paymentId: updated.id,
      invoiceId: payment.invoice_id,
      schoolId: payment.school_id,
      reason: dto.reason,
    } satisfies PaymentRejectedEvent);

    return updated;
  }

  async createRazorpayOrder(
    invoiceId: string,
    schoolId: string,
    createdBy: string,
  ): Promise<RazorpayOrder> {
    const invoice = await this.invoicesRepo.findById(invoiceId);
    if (!invoice) throw new NotFoundException(`Invoice '${invoiceId}' not found`);
    if (invoice.school_id !== schoolId)
      throw new ForbiddenException('Access denied to this invoice');
    if (invoice.status === 'PAID' || invoice.status === 'VOID') {
      throw new BadRequestException(`Cannot pay a ${invoice.status} invoice`);
    }

    const balance = Number(invoice.total_amount) - Number(invoice.amount_paid);
    if (balance <= 0) throw new BadRequestException('Invoice has no outstanding balance');

    const order = await this.razorpayService.createOrder(balance, 'INR', invoice.invoice_number);

    await this.paymentsRepo.create({
      id: generateId(),
      school_id: schoolId,
      subscription_id: invoice.subscription_id,
      invoice_id: invoice.id,
      amount: String(balance),
      status: 'PENDING',
      payment_method: 'RAZORPAY',
      gateway_order_id: order.order_id,
      is_manual: false,
      created_by: createdBy,
    });

    return order;
  }

  async handleRazorpayWebhook(rawBody: string, signature: string): Promise<void> {
    if (!this.razorpayService.verifyWebhookSignature(rawBody, signature)) {
      throw new ForbiddenException('Invalid Razorpay webhook signature');
    }

    const payload = JSON.parse(rawBody) as {
      event: string;
      payload: { payment: { entity: { id: string; order_id: string } } };
    };

    const entity = payload.payload?.payment?.entity;
    if (!entity?.order_id) return;

    const payment = await this.paymentsRepo.findByGatewayOrderId(entity.order_id);
    if (!payment || !payment.invoice_id) return;

    if (payload.event === 'payment.captured') {
      if (payment.status === 'SUCCESS') return; // already processed — webhook may retry
      const updated = await this.paymentsRepo.update(payment.id, {
        status: 'SUCCESS',
        gateway_payment_id: entity.id,
        approved_at: new Date(),
        paid_at: new Date(),
      });

      await this.events.emitAsync(APP_EVENTS.BILLING.PAYMENT_APPROVED, {
        paymentId: updated.id,
        invoiceId: payment.invoice_id,
        schoolId: payment.school_id,
        amount: updated.amount,
      } satisfies PaymentApprovedEvent);
    } else if (payload.event === 'payment.failed') {
      await this.paymentsRepo.update(payment.id, { status: 'FAILED' });
    }
  }
}
