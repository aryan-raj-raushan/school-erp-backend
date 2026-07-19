import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { invoices, invoiceLineItems } from '../../../database/drizzle/schema/invoices.schema';
import { subscriptionOneTimeCharges } from '../../../database/drizzle/schema/subscription-one-time-charges.schema';

export type Invoice = InferSelectModel<typeof invoices>;
export type NewInvoice = InferInsertModel<typeof invoices>;
export type InvoiceLineItem = InferSelectModel<typeof invoiceLineItems>;
export type NewInvoiceLineItem = InferInsertModel<typeof invoiceLineItems>;
export type OneTimeCharge = InferSelectModel<typeof subscriptionOneTimeCharges>;
export type NewOneTimeCharge = InferInsertModel<typeof subscriptionOneTimeCharges>;

export interface InvoiceWithLineItems extends Invoice {
  line_items: InvoiceLineItem[];
}

export interface DraftLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  lineType: 'SUBSCRIPTION' | 'ONE_TIME_CHARGE';
}
