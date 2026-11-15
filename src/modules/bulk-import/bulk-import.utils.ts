import { ColumnOption, IssueSeverity, RowStatus, ValidatedRow } from './bulk-import.types';

export function hasErrors(row: ValidatedRow): boolean {
  return row.issues.some((i) => i.severity === 'error');
}

export function rowStatus(row: ValidatedRow): RowStatus {
  if (hasErrors(row)) return 'error';
  return row.issues.length ? 'warning' : 'ready';
}

export function flag(
  row: ValidatedRow,
  column: string | undefined,
  message: string,
  severity: IssueSeverity = 'error',
): void {
  row.issues.push({ column, message, severity });
}

export function lower(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

export function todayIst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

export function yearsBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  let years = to.getUTCFullYear() - from.getUTCFullYear();
  const beforeBirthday =
    to.getUTCMonth() < from.getUTCMonth() ||
    (to.getUTCMonth() === from.getUTCMonth() && to.getUTCDate() < from.getUTCDate());
  if (beforeBirthday) years--;
  return years;
}

export function humanize(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function enumOptions(
  values: readonly string[],
  aliases: Record<string, string[]> = {},
): ColumnOption[] {
  return values.map((value) => ({ value, label: humanize(value), aliases: aliases[value] }));
}

export const YES_NO: ColumnOption[] = [
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
];

const BLOOD_GROUP_LABELS: Record<string, string> = {
  A_POSITIVE: 'A+',
  A_NEGATIVE: 'A-',
  B_POSITIVE: 'B+',
  B_NEGATIVE: 'B-',
  O_POSITIVE: 'O+',
  O_NEGATIVE: 'O-',
  AB_POSITIVE: 'AB+',
  AB_NEGATIVE: 'AB-',
};

export function bloodGroupOptions(): ColumnOption[] {
  return Object.entries(BLOOD_GROUP_LABELS).map(([value, label]) => ({
    value,
    label,
    aliases: [`${label}ve`, humanize(value)],
  }));
}
