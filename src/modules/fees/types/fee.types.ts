import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { feeMasterTypes, feeReceipts, feePayments } from '../../../database/drizzle/schema/fees.schema';

export type FeeMasterType = InferSelectModel<typeof feeMasterTypes>;
export type NewFeeMasterType = InferInsertModel<typeof feeMasterTypes>;

export type FeeReceipt = InferSelectModel<typeof feeReceipts>;
export type NewFeeReceipt = InferInsertModel<typeof feeReceipts>;

export type FeePayment = InferSelectModel<typeof feePayments>;
export type NewFeePayment = InferInsertModel<typeof feePayments>;

export interface FeeItem {
  fee_type_id: string;
  fee_type_name: string;
  amount: number;
}
