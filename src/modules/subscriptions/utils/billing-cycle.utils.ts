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

/**
 * First cycle boundary strictly after `after`, counted from the subscription's own
 * start date so month-end anchors don't drift (31-Jan -> 28-Feb -> 31-Mar).
 */
export function nextCycleBoundary(anchor: Date, after: Date, planType: string): Date {
  const months = CYCLE_MONTHS[planType] ?? 1;
  const elapsedMonths =
    (after.getUTCFullYear() - anchor.getUTCFullYear()) * 12 +
    (after.getUTCMonth() - anchor.getUTCMonth());
  let cycles = Math.max(1, Math.floor(elapsedMonths / months));
  while (DateUtils.addMonths(anchor, cycles * months) <= after) cycles++;
  return DateUtils.addMonths(anchor, cycles * months);
}

/** Paid billing starts when a trial ends; otherwise at the subscription start. */
export function billingAnchor(sub: {
  is_trial: boolean | null;
  trial_end_date: Date | null;
  start_date: Date | null;
  created_at: Date;
}): Date {
  if (sub.is_trial && sub.trial_end_date) return sub.trial_end_date;
  return sub.start_date ?? sub.created_at;
}
