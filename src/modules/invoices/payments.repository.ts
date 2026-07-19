import { Injectable, Inject } from '@nestjs/common';
import { eq, and, inArray } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { subscriptionPayments } from '../../database/drizzle/schema';
import { InvoicePayment, NewInvoicePayment } from './types/payment.types';

@Injectable()
export class PaymentsRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  async create(data: NewInvoicePayment): Promise<InvoicePayment> {
    const [row] = await this.db.insert(subscriptionPayments).values(data).returning();
    return row;
  }

  async findById(id: string): Promise<InvoicePayment | undefined> {
    const [row] = await this.db
      .select()
      .from(subscriptionPayments)
      .where(eq(subscriptionPayments.id, id));
    return row;
  }

  async findByInvoiceId(invoiceId: string): Promise<InvoicePayment[]> {
    return this.db
      .select()
      .from(subscriptionPayments)
      .where(eq(subscriptionPayments.invoice_id, invoiceId))
      .orderBy(subscriptionPayments.created_at);
  }

  async findByGatewayOrderId(orderId: string): Promise<InvoicePayment | undefined> {
    const [row] = await this.db
      .select()
      .from(subscriptionPayments)
      .where(eq(subscriptionPayments.gateway_order_id, orderId));
    return row;
  }

  async findPendingVerification(schoolIds?: string[]): Promise<InvoicePayment[]> {
    const conditions = [eq(subscriptionPayments.status, 'PENDING_VERIFICATION')];
    if (schoolIds && schoolIds.length > 0) {
      conditions.push(inArray(subscriptionPayments.school_id, schoolIds));
    }
    return this.db
      .select()
      .from(subscriptionPayments)
      .where(and(...conditions))
      .orderBy(subscriptionPayments.created_at);
  }

  async update(id: string, data: Partial<NewInvoicePayment>): Promise<InvoicePayment> {
    const [row] = await this.db
      .update(subscriptionPayments)
      .set({ ...data, updated_at: new Date() })
      .where(eq(subscriptionPayments.id, id))
      .returning();
    return row;
  }
}
