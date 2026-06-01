import { Injectable, Inject } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { feeMasterTypes, feeReceipts, feePayments } from '../../database/drizzle/schema/fees.schema';
import { FeeMasterType, NewFeeMasterType, FeeReceipt, NewFeeReceipt, FeePayment, NewFeePayment } from './types/fee.types';

@Injectable()
export class FeesRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  // Fee Master Types
  async findAllMasterTypes(schoolId: string): Promise<FeeMasterType[]> {
    return this.db
      .select()
      .from(feeMasterTypes)
      .where(and(eq(feeMasterTypes.school_id, schoolId), eq(feeMasterTypes.deleted, false)))
      .orderBy(feeMasterTypes.name);
  }

  async findMasterTypeById(id: string, schoolId: string): Promise<FeeMasterType | undefined> {
    const [row] = await this.db
      .select()
      .from(feeMasterTypes)
      .where(and(eq(feeMasterTypes.id, id), eq(feeMasterTypes.school_id, schoolId), eq(feeMasterTypes.deleted, false)));
    return row;
  }

  async createMasterType(data: NewFeeMasterType): Promise<FeeMasterType> {
    const [row] = await this.db.insert(feeMasterTypes).values(data).returning();
    return row;
  }

  async updateMasterType(id: string, schoolId: string, data: Partial<NewFeeMasterType>): Promise<FeeMasterType> {
    const [row] = await this.db
      .update(feeMasterTypes)
      .set({ ...data, updated_at: new Date() })
      .where(and(eq(feeMasterTypes.id, id), eq(feeMasterTypes.school_id, schoolId)))
      .returning();
    return row;
  }

  async softDeleteMasterType(id: string, schoolId: string): Promise<void> {
    await this.db
      .update(feeMasterTypes)
      .set({ deleted: true, is_active: false, updated_at: new Date() })
      .where(and(eq(feeMasterTypes.id, id), eq(feeMasterTypes.school_id, schoolId)));
  }

  // Fee Receipts
  async findAllReceipts(schoolId: string, page: number, limit: number, studentId?: string): Promise<FeeReceipt[]> {
    const offset = (page - 1) * limit;
    const conditions = [eq(feeReceipts.school_id, schoolId)];
    if (studentId) conditions.push(eq(feeReceipts.student_id, studentId));

    return this.db
      .select()
      .from(feeReceipts)
      .where(and(...conditions))
      .orderBy(feeReceipts.created_at)
      .limit(limit)
      .offset(offset);
  }

  async findReceiptById(id: string, schoolId: string): Promise<FeeReceipt | undefined> {
    const [row] = await this.db
      .select()
      .from(feeReceipts)
      .where(and(eq(feeReceipts.id, id), eq(feeReceipts.school_id, schoolId)));
    return row;
  }

  async createReceipt(data: NewFeeReceipt): Promise<FeeReceipt> {
    const [row] = await this.db.insert(feeReceipts).values(data).returning();
    return row;
  }

  async updateReceipt(id: string, schoolId: string, data: Partial<NewFeeReceipt>): Promise<FeeReceipt> {
    const [row] = await this.db
      .update(feeReceipts)
      .set({ ...data, updated_at: new Date() })
      .where(and(eq(feeReceipts.id, id), eq(feeReceipts.school_id, schoolId)))
      .returning();
    return row;
  }

  async getNextReceiptNumber(schoolId: string): Promise<string> {
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(feeReceipts)
      .where(eq(feeReceipts.school_id, schoolId));
    return `RCP-${String(Number(count) + 1).padStart(6, '0')}`;
  }

  // Fee Payments
  async createPayment(data: NewFeePayment): Promise<FeePayment> {
    const [row] = await this.db.insert(feePayments).values(data).returning();
    return row;
  }

  async findPaymentsByReceipt(receiptId: string, schoolId: string): Promise<FeePayment[]> {
    return this.db
      .select()
      .from(feePayments)
      .where(and(eq(feePayments.receipt_id, receiptId), eq(feePayments.school_id, schoolId)))
      .orderBy(feePayments.paid_at);
  }
}
