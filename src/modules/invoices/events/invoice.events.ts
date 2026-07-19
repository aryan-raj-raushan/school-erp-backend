export interface InvoiceGeneratedEvent {
  invoiceId: string;
  schoolId: string;
  totalAmount: string;
  dueDate: Date;
}

export interface InvoicePaidEvent {
  invoiceId: string;
  schoolId: string;
}
