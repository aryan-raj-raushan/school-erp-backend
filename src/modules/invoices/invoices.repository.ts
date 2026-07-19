import { Injectable, Inject } from '@nestjs/common';
import { eq, and, inArray, sql, lt } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import {
  invoices,
  invoiceLineItems,
  invoiceCounters,
  subscriptionOneTimeCharges,
  students,
  companyUserSchools,
} from '../../database/drizzle/schema';
import { InvoiceFilterDto } from './dto/invoice-filter.dto';
import {
  Invoice,
  InvoiceLineItem,
  OneTimeCharge,
  NewOneTimeCharge,
  DraftLineItem,
} from './types/invoice.types';
import { generateId } from '../../utils/uuid.utils';

@Injectable()
export class InvoicesRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  private buildConditions(filters: InvoiceFilterDto, allowedSchoolIds?: string[]) {
    const conditions = [];
    if (allowedSchoolIds) conditions.push(inArray(invoices.school_id, allowedSchoolIds));
    if (filters.school_id) conditions.push(eq(invoices.school_id, filters.school_id));
    if (filters.status) conditions.push(eq(invoices.status, filters.status));
    return conditions;
  }

  async findAll(filters: InvoiceFilterDto, allowedSchoolIds?: string[]): Promise<Invoice[]> {
    if (allowedSchoolIds && allowedSchoolIds.length === 0) return [];
    const conditions = this.buildConditions(filters, allowedSchoolIds);
    const limit = filters.limit ?? 20;
    const offset = ((filters.page ?? 1) - 1) * limit;
    return this.db
      .select()
      .from(invoices)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(invoices.created_at)
      .limit(limit)
      .offset(offset);
  }

  async count(filters: InvoiceFilterDto, allowedSchoolIds?: string[]): Promise<number> {
    if (allowedSchoolIds && allowedSchoolIds.length === 0) return 0;
    const conditions = this.buildConditions(filters, allowedSchoolIds);
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(invoices)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    return Number(count);
  }

  async findById(id: string): Promise<Invoice | undefined> {
    const [row] = await this.db.select().from(invoices).where(eq(invoices.id, id));
    return row;
  }

  async findLineItems(invoiceId: string): Promise<InvoiceLineItem[]> {
    return this.db
      .select()
      .from(invoiceLineItems)
      .where(eq(invoiceLineItems.invoice_id, invoiceId));
  }

  async updatePdf(id: string, data: { pdf_url: string; pdf_s3_key: string }): Promise<void> {
    await this.db
      .update(invoices)
      .set({ ...data, updated_at: new Date() })
      .where(eq(invoices.id, id));
  }

  async updatePaymentState(
    id: string,
    data: { amount_paid: string; status: Invoice['status']; paid_at?: Date },
  ): Promise<Invoice> {
    const [row] = await this.db
      .update(invoices)
      .set({ ...data, updated_at: new Date() })
      .where(eq(invoices.id, id))
      .returning();
    return row;
  }

  async markOverdue(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.db
      .update(invoices)
      .set({ status: 'OVERDUE', updated_at: new Date() })
      .where(inArray(invoices.id, ids));
  }

  async hasOverdueInvoices(schoolId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: invoices.id })
      .from(invoices)
      .where(and(eq(invoices.school_id, schoolId), eq(invoices.status, 'OVERDUE')))
      .limit(1);
    return !!row;
  }

  async findOverdueCandidates(): Promise<{ id: string; school_id: string }[]> {
    return this.db
      .select({ id: invoices.id, school_id: invoices.school_id })
      .from(invoices)
      .where(
        and(
          inArray(invoices.status, ['ISSUED', 'PARTIALLY_PAID']),
          lt(invoices.due_date, new Date()),
        ),
      );
  }

  async findPendingOneTimeCharges(schoolId: string): Promise<OneTimeCharge[]> {
    return this.db
      .select()
      .from(subscriptionOneTimeCharges)
      .where(
        and(
          eq(subscriptionOneTimeCharges.school_id, schoolId),
          eq(subscriptionOneTimeCharges.status, 'PENDING'),
        ),
      );
  }

  async createOneTimeCharge(data: NewOneTimeCharge): Promise<OneTimeCharge> {
    const [row] = await this.db.insert(subscriptionOneTimeCharges).values(data).returning();
    return row;
  }

  async countActiveStudents(schoolId: string): Promise<number> {
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(students)
      .where(
        and(
          eq(students.school_id, schoolId),
          eq(students.status, 'ACTIVE'),
          eq(students.deleted, false),
        ),
      );
    return Number(count);
  }

  /**
   * Appends an extra line item to an already-generated invoice and
   * recomputes subtotal/total_amount from the full, current line-item set —
   * all in one transaction so a concurrent add can't produce a total that
   * doesn't match what's actually on the invoice.
   */
  async addLineItem(invoiceId: string, item: DraftLineItem): Promise<Invoice> {
    return this.db.transaction(async (tx) => {
      await tx.insert(invoiceLineItems).values({
        id: generateId(),
        invoice_id: invoiceId,
        description: item.description,
        quantity: item.quantity,
        unit_price: String(item.unitPrice),
        amount: String(item.amount),
        line_type: item.lineType,
      });

      const [invoice] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId));
      const lineItems = await tx
        .select()
        .from(invoiceLineItems)
        .where(eq(invoiceLineItems.invoice_id, invoiceId));

      const subtotal = lineItems.reduce((sum, l) => sum + Number(l.amount), 0);
      const total = subtotal + Number(invoice.tax_amount) - Number(invoice.discount_amount);

      const [updated] = await tx
        .update(invoices)
        .set({ subtotal: String(subtotal), total_amount: String(total), updated_at: new Date() })
        .where(eq(invoices.id, invoiceId))
        .returning();

      return updated;
    });
  }

  async findSchoolIdsByCompanyUserId(userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ school_id: companyUserSchools.school_id })
      .from(companyUserSchools)
      .where(eq(companyUserSchools.user_id, userId));
    return rows.map((r) => r.school_id);
  }

  /**
   * Atomically allocates the next INV-{year}-{seq} number, inserts the
   * invoice + its line items, and marks any consumed one-time charges as
   * INVOICED — all in one transaction so a concurrent generation run can
   * never produce a duplicate invoice number or double-bill a charge.
   */
  async createInvoiceWithLines(params: {
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
    return this.db.transaction(async (tx) => {
      const year = new Date().getFullYear();
      const [counterRow] = await tx
        .select()
        .from(invoiceCounters)
        .where(eq(invoiceCounters.year, year));

      let seq: number;
      if (!counterRow) {
        seq = 1;
        await tx.insert(invoiceCounters).values({ year, last_seq: seq });
      } else {
        seq = counterRow.last_seq + 1;
        await tx
          .update(invoiceCounters)
          .set({ last_seq: seq })
          .where(eq(invoiceCounters.year, year));
      }
      const invoiceNumber = `INV-${year}-${String(seq).padStart(6, '0')}`;

      const subtotal = params.lines.reduce((sum, l) => sum + l.amount, 0);
      // Nothing to collect — skip the unpaid state entirely so a free/zero
      // invoice never shows up as overdue and never needs a "payment" of ₹0.
      const isZeroInvoice = subtotal <= 0;

      const [invoice] = await tx
        .insert(invoices)
        .values({
          id: generateId(),
          invoice_number: invoiceNumber,
          school_id: params.schoolId,
          subscription_id: params.subscriptionId,
          billing_period_start: params.billingPeriodStart,
          billing_period_end: params.billingPeriodEnd,
          student_count_snapshot: params.studentCountSnapshot,
          subtotal: String(subtotal),
          total_amount: String(subtotal),
          due_date: params.dueDate,
          notes: params.notes,
          created_by: params.createdBy,
          ...(isZeroInvoice && {
            status: 'PAID',
            amount_paid: String(subtotal),
            paid_at: new Date(),
          }),
        })
        .returning();

      if (params.lines.length > 0) {
        await tx.insert(invoiceLineItems).values(
          params.lines.map((l) => ({
            id: generateId(),
            invoice_id: invoice.id,
            description: l.description,
            quantity: l.quantity,
            unit_price: String(l.unitPrice),
            amount: String(l.amount),
            line_type: l.lineType,
          })),
        );
      }

      if (params.chargeIdsToMarkInvoiced.length > 0) {
        await tx
          .update(subscriptionOneTimeCharges)
          .set({ status: 'INVOICED' })
          .where(inArray(subscriptionOneTimeCharges.id, params.chargeIdsToMarkInvoiced));
      }

      return invoice;
    });
  }
}
