import { Injectable, Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { feePaymentGatewayOrders } from '../../database/drizzle/schema/fee-payment-gateway-orders.schema';

export type FeePaymentGatewayOrder = typeof feePaymentGatewayOrders.$inferSelect;
export type NewFeePaymentGatewayOrder = typeof feePaymentGatewayOrders.$inferInsert;

@Injectable()
export class FeePaymentGatewayOrdersRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  async create(data: NewFeePaymentGatewayOrder): Promise<FeePaymentGatewayOrder> {
    const [row] = await this.db.insert(feePaymentGatewayOrders).values(data).returning();
    return row;
  }

  async findById(id: string, schoolId: string): Promise<FeePaymentGatewayOrder | undefined> {
    const [row] = await this.db
      .select()
      .from(feePaymentGatewayOrders)
      .where(
        and(
          eq(feePaymentGatewayOrders.id, id),
          eq(feePaymentGatewayOrders.school_id, schoolId),
        ),
      );
    return row;
  }

  async findByGatewayOrderId(gatewayOrderId: string): Promise<FeePaymentGatewayOrder | undefined> {
    const [row] = await this.db
      .select()
      .from(feePaymentGatewayOrders)
      .where(eq(feePaymentGatewayOrders.gateway_order_id, gatewayOrderId));
    return row;
  }

  async markPaid(
    id: string,
    gatewayPaymentId: string,
    gatewaySignature: string,
  ): Promise<FeePaymentGatewayOrder> {
    const [row] = await this.db
      .update(feePaymentGatewayOrders)
      .set({
        status: 'PAID',
        gateway_payment_id: gatewayPaymentId,
        gateway_signature: gatewaySignature,
        updated_at: new Date(),
      })
      .where(eq(feePaymentGatewayOrders.id, id))
      .returning();
    return row;
  }

  async markFailed(id: string): Promise<FeePaymentGatewayOrder> {
    const [row] = await this.db
      .update(feePaymentGatewayOrders)
      .set({ status: 'FAILED', updated_at: new Date() })
      .where(eq(feePaymentGatewayOrders.id, id))
      .returning();
    return row;
  }
}
