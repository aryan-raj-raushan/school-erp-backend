export interface PaymentSubmittedEvent {
  paymentId: string;
  invoiceId: string;
  schoolId: string;
}

export interface PaymentApprovedEvent {
  paymentId: string;
  invoiceId: string;
  schoolId: string;
  amount: string;
}

export interface PaymentRejectedEvent {
  paymentId: string;
  invoiceId: string;
  schoolId: string;
  reason: string;
}
