import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InvoicesRepository } from './invoices.repository';
import { SubscriptionsRepository } from '../subscriptions/subscriptions.repository';
import { SchoolsRepository } from '../schools/schools.repository';
import { UploadsService } from '../uploads/uploads.service';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { DateUtils } from '../../utils/date.utils';
import { addBillingCycle } from '../subscriptions/utils/billing-cycle.utils';
import { generateInvoicePdf } from './utils/invoice-pdf.utils';
import { PaginationResponse } from '../../shared/responses/api-response';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreateOneTimeChargeDto } from './dto/create-one-time-charge.dto';
import { AddLineItemDto } from './dto/add-line-item.dto';
import { InvoiceFilterDto } from './dto/invoice-filter.dto';
import { Invoice, InvoiceWithLineItems, OneTimeCharge, DraftLineItem } from './types/invoice.types';
import { CompanyRole } from '../../shared/enums';
import { CacheTTL } from '../../shared/constants';
import { APP_EVENTS } from '../../shared/events/event-names';
import { InvoiceGeneratedEvent } from './events/invoice.events';

const DEFAULT_DUE_DAYS = 15;

@Injectable()
export class InvoicesService {
  constructor(
    private readonly invoicesRepo: InvoicesRepository,
    private readonly subscriptionsRepo: SubscriptionsRepository,
    private readonly schoolsRepo: SchoolsRepository,
    private readonly uploadsService: UploadsService,
    private readonly redisService: RedisService,
    private readonly events: EventEmitter2,
  ) {}

  // Mirrors SubscriptionsService/SchoolsService's tenant-scoping helper —
  // null = unrestricted, [] = no access, string[] = scoped. OPERATOR is
  // unrestricted too — per the PRD they verify payments company-wide, unlike
  // SALES who only sees the schools explicitly assigned to them.
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

  async findAll(
    filters: InvoiceFilterDto,
    userId: string,
    role: string,
  ): Promise<PaginationResponse<Invoice>> {
    const permitted = await this.getPermittedSchoolIds(userId, role);
    const [items, total] = await Promise.all([
      this.invoicesRepo.findAll(filters, permitted ?? undefined),
      this.invoicesRepo.count(filters, permitted ?? undefined),
    ]);
    return PaginationResponse.of(items, total, filters);
  }

  async findMy(schoolId: string, filters: InvoiceFilterDto): Promise<PaginationResponse<Invoice>> {
    const scoped = { ...filters, school_id: schoolId };
    const [items, total] = await Promise.all([
      this.invoicesRepo.findAll(scoped),
      this.invoicesRepo.count(scoped),
    ]);
    return PaginationResponse.of(items, total, filters);
  }

  async getWithLineItems(id: string): Promise<InvoiceWithLineItems> {
    const invoice = await this.invoicesRepo.findById(id);
    if (!invoice) throw new NotFoundException(`Invoice '${id}' not found`);
    const line_items = await this.invoicesRepo.findLineItems(id);
    return { ...invoice, line_items };
  }

  async findByIdForCompanyUser(
    id: string,
    userId: string,
    role: string,
  ): Promise<InvoiceWithLineItems> {
    const invoice = await this.getWithLineItems(id);
    const permitted = await this.getPermittedSchoolIds(userId, role);
    if (permitted !== null && !permitted.includes(invoice.school_id)) {
      throw new ForbiddenException('Access denied to this invoice');
    }
    return invoice;
  }

  async findByIdForSchool(id: string, schoolId: string): Promise<InvoiceWithLineItems> {
    const invoice = await this.getWithLineItems(id);
    if (invoice.school_id !== schoolId)
      throw new ForbiddenException('Access denied to this invoice');
    return invoice;
  }

  async createOneTimeCharge(
    dto: CreateOneTimeChargeDto,
    createdBy: string,
    role: string,
  ): Promise<OneTimeCharge> {
    const permitted = await this.getPermittedSchoolIds(createdBy, role);
    if (permitted !== null && !permitted.includes(dto.school_id)) {
      throw new ForbiddenException('Access denied to this school');
    }

    const charge = await this.invoicesRepo.createOneTimeCharge({
      id: generateId(),
      school_id: dto.school_id,
      subscription_id: dto.subscription_id,
      charge_type: dto.charge_type,
      description: dto.description,
      amount: String(dto.amount),
      quantity: dto.quantity ?? 1,
      created_by: createdBy,
    });

    // One-time charges are billed immediately rather than waiting for the
    // next recurring cycle — this is an intra-module operation (charge →
    // invoice, both owned by billing), not a cross-domain side effect, so
    // it's a direct call rather than an event.
    await this.generateOneTimeChargesInvoice(dto.school_id, dto.subscription_id, createdBy);

    return charge;
  }

  /** Bills only pending one-time charges for a school — no recurring line. No-op if none are pending. */
  async generateOneTimeChargesInvoice(
    schoolId: string,
    subscriptionId: string | undefined,
    createdBy?: string,
  ): Promise<Invoice | null> {
    const charges = await this.invoicesRepo.findPendingOneTimeCharges(schoolId);
    if (charges.length === 0) return null;

    const lines: DraftLineItem[] = charges.map((c) => ({
      description: c.description || c.charge_type,
      quantity: c.quantity,
      unitPrice: Number(c.amount),
      amount: Number(c.amount) * c.quantity,
      lineType: 'ONE_TIME_CHARGE',
    }));

    return this.finalizeInvoice({
      schoolId,
      subscriptionId,
      lines,
      dueDate: DateUtils.addDays(new Date(), DEFAULT_DUE_DAYS),
      createdBy,
      chargeIdsToMarkInvoiced: charges.map((c) => c.id),
    });
  }

  /** Manual "generate now" (Super Admin) or the recurring-billing cron. */
  async generateForSubscription(
    subscriptionId: string,
    opts: {
      dueDate?: Date;
      notes?: string;
      createdBy?: string;
      extraItems?: { description: string; amount: number; quantity?: number }[];
    } = {},
  ): Promise<Invoice> {
    const sub = await this.subscriptionsRepo.findById(subscriptionId);
    if (!sub) throw new NotFoundException(`Subscription '${subscriptionId}' not found`);

    const periodStart = sub.start_date ?? sub.created_at;
    const periodEnd = sub.next_billing_date ?? new Date();

    const lines: DraftLineItem[] = [];
    let studentCountSnapshot: number | undefined;

    if (sub.billing_model === 'PER_STUDENT') {
      const studentCount = await this.invoicesRepo.countActiveStudents(sub.school_id);
      const unitPrice = Number(sub.price_per_student ?? 0);
      studentCountSnapshot = studentCount;
      lines.push({
        description: `${sub.plan_name} — ${studentCount} student(s)`,
        quantity: studentCount,
        unitPrice,
        amount: studentCount * unitPrice,
        lineType: 'SUBSCRIPTION',
      });
    } else {
      const amount = Number(sub.amount ?? 0);
      lines.push({
        description: sub.plan_name,
        quantity: 1,
        unitPrice: amount,
        amount,
        lineType: 'SUBSCRIPTION',
      });
    }

    const charges = await this.invoicesRepo.findPendingOneTimeCharges(sub.school_id);
    for (const c of charges) {
      lines.push({
        description: c.description || c.charge_type,
        quantity: c.quantity,
        unitPrice: Number(c.amount),
        amount: Number(c.amount) * c.quantity,
        lineType: 'ONE_TIME_CHARGE',
      });
    }

    for (const item of opts.extraItems ?? []) {
      const quantity = item.quantity ?? 1;
      lines.push({
        description: item.description,
        quantity,
        unitPrice: item.amount,
        amount: item.amount * quantity,
        lineType: 'ONE_TIME_CHARGE',
      });
    }

    const invoice = await this.finalizeInvoice({
      schoolId: sub.school_id,
      subscriptionId: sub.id,
      billingPeriodStart: periodStart,
      billingPeriodEnd: periodEnd,
      studentCountSnapshot,
      lines,
      dueDate: opts.dueDate ?? DateUtils.addDays(new Date(), DEFAULT_DUE_DAYS),
      notes: opts.notes,
      createdBy: opts.createdBy,
      chargeIdsToMarkInvoiced: charges.map((c) => c.id),
    });

    // Advance the cycle anchor regardless of who triggered generation, so the
    // cron doesn't immediately re-bill the same period on its next run.
    await this.subscriptionsRepo.update(sub.id, {
      next_billing_date: addBillingCycle(periodEnd, sub.plan_type),
    });

    return invoice;
  }

  async createManual(dto: CreateInvoiceDto, createdBy: string, role: string): Promise<Invoice> {
    const sub = await this.subscriptionsRepo.findById(dto.subscription_id);
    if (!sub) throw new NotFoundException(`Subscription '${dto.subscription_id}' not found`);

    const permitted = await this.getPermittedSchoolIds(createdBy, role);
    if (permitted !== null && !permitted.includes(sub.school_id)) {
      throw new ForbiddenException('Access denied to this school');
    }

    return this.generateForSubscription(dto.subscription_id, {
      dueDate: dto.due_date ? new Date(dto.due_date) : undefined,
      notes: dto.notes,
      createdBy,
      extraItems: dto.extra_items,
    });
  }

  /** Adds an ad-hoc item to an already-generated invoice — e.g. an add-on discovered after the fact. */
  async addLineItem(
    invoiceId: string,
    dto: AddLineItemDto,
    userId: string,
    role: string,
  ): Promise<InvoiceWithLineItems> {
    const invoice = await this.invoicesRepo.findById(invoiceId);
    if (!invoice) throw new NotFoundException(`Invoice '${invoiceId}' not found`);

    const permitted = await this.getPermittedSchoolIds(userId, role);
    if (permitted !== null && !permitted.includes(invoice.school_id)) {
      throw new ForbiddenException('Access denied to this invoice');
    }
    if (invoice.status === 'PAID' || invoice.status === 'VOID') {
      throw new BadRequestException(`Cannot add items to a ${invoice.status} invoice`);
    }

    const quantity = dto.quantity ?? 1;
    await this.invoicesRepo.addLineItem(invoiceId, {
      description: dto.description,
      quantity,
      unitPrice: dto.amount,
      amount: dto.amount * quantity,
      lineType: 'ONE_TIME_CHARGE',
    });

    return this.getWithLineItems(invoiceId);
  }

  private async finalizeInvoice(params: {
    schoolId: string;
    subscriptionId?: string;
    billingPeriodStart?: Date;
    billingPeriodEnd?: Date;
    studentCountSnapshot?: number;
    lines: DraftLineItem[];
    dueDate: Date;
    notes?: string;
    createdBy?: string;
    chargeIdsToMarkInvoiced: string[];
  }): Promise<Invoice> {
    const invoice = await this.invoicesRepo.createInvoiceWithLines(params);

    await this.events.emitAsync(APP_EVENTS.BILLING.INVOICE_GENERATED, {
      invoiceId: invoice.id,
      schoolId: invoice.school_id,
      totalAmount: invoice.total_amount,
      dueDate: invoice.due_date,
    } satisfies InvoiceGeneratedEvent);

    return invoice;
  }

  /** Lazily renders + uploads the PDF on first request, then serves the cached URL. */
  async getPdfUrl(id: string): Promise<string> {
    const invoice = await this.getWithLineItems(id);
    if (invoice.pdf_url) return invoice.pdf_url;

    const school = await this.schoolsRepo.findById(invoice.school_id);
    const buffer = await generateInvoicePdf({
      invoice_number: invoice.invoice_number,
      school_name: school?.name ?? invoice.school_id,
      billing_period_start: invoice.billing_period_start,
      billing_period_end: invoice.billing_period_end,
      issued_at: invoice.issued_at,
      due_date: invoice.due_date,
      status: invoice.status,
      subtotal: invoice.subtotal,
      tax_amount: invoice.tax_amount,
      discount_amount: invoice.discount_amount,
      total_amount: invoice.total_amount,
      amount_paid: invoice.amount_paid,
      notes: invoice.notes,
      line_items: invoice.line_items.map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unit_price: l.unit_price,
        amount: l.amount,
      })),
    });

    const file = {
      buffer,
      originalname: `${invoice.invoice_number}.pdf`,
      mimetype: 'application/pdf',
      size: buffer.length,
    } as Express.Multer.File;

    const { url, s3Key } = await this.uploadsService.uploadDocument(
      file,
      invoice.school_id,
      'system',
      {
        reference_id: invoice.id,
        reference_type: 'invoice',
        document_type: 'invoice_pdf',
      },
    );

    await this.invoicesRepo.updatePdf(invoice.id, { pdf_url: url, pdf_s3_key: s3Key });
    return url;
  }
}
