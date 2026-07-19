/**
 * Central registry of app-wide domain event names, shared by every module
 * via the global EventsModule (src/modules/events/events.module.ts).
 * Add a new section here whenever a module needs to emit/listen for events —
 * keeps event names discoverable in one place instead of scattered string literals.
 */
export const APP_EVENTS = {
  SCHOOL: {
    CREATED: 'school.created',
  },
  EXAM: {
    DELETED: 'exam.deleted',
  },
  SITTING_PLAN: {
    ROOMS_ASSIGNED: 'sitting-plan.rooms-assigned',
  },
  EXAM_ATTENDANCE: {
    ABSENT_MARKED: 'exam-attendance.absent-marked',
    PRESENT_MARKED: 'exam-attendance.present-marked',
  },
  BILLING: {
    SUBSCRIPTION_ASSIGNED: 'billing.subscription-assigned',
    ONE_TIME_CHARGE_ADDED: 'billing.one-time-charge-added',
    INVOICE_GENERATED: 'billing.invoice-generated',
    INVOICE_PAID: 'billing.invoice-paid',
    PAYMENT_SUBMITTED: 'billing.payment-submitted',
    PAYMENT_APPROVED: 'billing.payment-approved',
    PAYMENT_REJECTED: 'billing.payment-rejected',
  },
  SCHOOL_RESTRICTION: {
    APPLIED: 'school-restriction.applied',
    LIFTED: 'school-restriction.lifted',
  },
  RFID_INVENTORY: {
    DEVICE_ASSIGNED: 'rfid-inventory.device-assigned',
  },
} as const;
