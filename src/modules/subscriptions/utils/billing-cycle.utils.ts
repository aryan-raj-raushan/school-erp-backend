import { DateUtils } from '../../../utils/date.utils';
import { SubscriptionPlan } from '../../../shared/enums';

const CYCLE_MONTHS: Record<string, number> = {
  [SubscriptionPlan.MONTHLY]: 1,
  [SubscriptionPlan.QUARTERLY]: 3,
  [SubscriptionPlan.HALF_YEARLY]: 6,
  [SubscriptionPlan.ANNUAL]: 12,
};

/** Advance a date by one billing cycle for the given plan_type (CUSTOM falls back to monthly). */
export function addBillingCycle(date: Date, planType: string): Date {
  const months = CYCLE_MONTHS[planType] ?? 1;
  return DateUtils.addMonths(date, months);
}
