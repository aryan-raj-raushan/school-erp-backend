export enum SubscriptionPlan {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  HALF_YEARLY = 'HALF_YEARLY',
  ANNUAL = 'ANNUAL',
  CUSTOM = 'CUSTOM',
}

export enum PaymentMethod {
  RAZORPAY = 'RAZORPAY',
  STRIPE = 'STRIPE',
  BANK_TRANSFER = 'BANK_TRANSFER',
  QR_CODE = 'QR_CODE',
  CHEQUE = 'CHEQUE',
  CASH = 'CASH',
  OTHER = 'OTHER',
}

export enum BillingModel {
  PER_STUDENT = 'PER_STUDENT',
  FLAT = 'FLAT',
}

export enum RestrictionMode {
  NONE = 'NONE',
  SOFT = 'SOFT',
  PARTIAL = 'PARTIAL',
  COMPLETE = 'COMPLETE',
}

export enum OneTimeChargeType {
  RFID_DEVICE = 'RFID_DEVICE',
  RFID_INSTALLATION = 'RFID_INSTALLATION',
  SETUP = 'SETUP',
  TRAINING = 'TRAINING',
  SUPPORT = 'SUPPORT',
  OTHER = 'OTHER',
}

export enum InvoiceLineType {
  SUBSCRIPTION = 'SUBSCRIPTION',
  ONE_TIME_CHARGE = 'ONE_TIME_CHARGE',
}
