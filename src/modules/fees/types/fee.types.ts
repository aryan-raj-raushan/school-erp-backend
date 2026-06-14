import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import {
  feeTypes,
  feePlans,
  feeClassStructures,
  transportRoutes,
  transportRouteFees,
  feeBills,
  feeBillPayments,
  feeDiscounts,
  feeLateRules,
} from '../../../database/drizzle/schema';

export type FeeType = InferSelectModel<typeof feeTypes>;
export type NewFeeType = InferInsertModel<typeof feeTypes>;

export type FeePlan = InferSelectModel<typeof feePlans>;
export type NewFeePlan = InferInsertModel<typeof feePlans>;

export type FeeClassStructure = InferSelectModel<typeof feeClassStructures>;
export type NewFeeClassStructure = InferInsertModel<typeof feeClassStructures>;

export type TransportRoute = InferSelectModel<typeof transportRoutes>;
export type NewTransportRoute = InferInsertModel<typeof transportRoutes>;

export type TransportRouteFee = InferSelectModel<typeof transportRouteFees>;
export type NewTransportRouteFee = InferInsertModel<typeof transportRouteFees>;

export type FeeBill = InferSelectModel<typeof feeBills>;
export type NewFeeBill = InferInsertModel<typeof feeBills>;

export type FeeBillPayment = InferSelectModel<typeof feeBillPayments>;
export type NewFeeBillPayment = InferInsertModel<typeof feeBillPayments>;

export type FeeDiscount = InferSelectModel<typeof feeDiscounts>;
export type NewFeeDiscount = InferInsertModel<typeof feeDiscounts>;

export type FeeLateRule = InferSelectModel<typeof feeLateRules>;
export type NewFeeLateRule = InferInsertModel<typeof feeLateRules>;

export interface FeeTypeWithHead extends FeeType {
  income_head_name?: string | null;
}

export interface FeeClassStructureWithType extends FeeClassStructure {
  fee_type_name: string;
  fee_category: string;
  frequency: string;
  applicable_months: string[] | null;
}

export interface FeeClassStructureAllTypes {
  fee_type_id: string;
  fee_type_name: string;
  fee_category: string;
  frequency: string;
  applicable_months: string[] | null;
  fee_type_active: boolean;
  structure_id: string | null;
  amount: string | null;
  is_enabled: boolean | null;
}

export interface TransportRouteFeeWithType extends TransportRouteFee {
  fee_type_name: string;
  frequency: string;
  applicable_months: string[] | null;
}

export interface FeeBillWithType extends FeeBill {
  fee_type_name: string;
  fee_category: string;
  frequency: string;
  fee_plan_name?: string | null;
}

export interface StudentMonthlyDue {
  student_id: string;
  student_name: string;
  father_name: string | null;
  phone: string | null;
  admission_number: string | null;
  roll_no: string | null;
  month: string;
  due_amount: string;
  bill_ids: string[];
}

export interface ClassStructureViewItem {
  fee_type_id: string;
  fee_type_name: string;
  frequency: string;
  bill_month: string | null;
  payment_label: string;
  amount: string;
  total_payment: string;
}

export interface DemandReceiptStudent {
  student_id: string;
  student_name: string;
  father_name: string | null;
  admission_number: string | null;
  roll_no: string | null;
  bills: {
    fee_type_name: string;
    frequency: string;
    bill_month: string | null;
    total_amount: string;
    paid_amount: string;
    due_amount: string;
    due_date: string | null;
  }[];
  total_due: string;
}
