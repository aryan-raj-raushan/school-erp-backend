import { REGEX } from '../../../utils/regex.utils';
import { ColumnOption, ImportColumn, RawCell } from '../bulk-import.types';

export interface ParsedCell {
  value?: string | number | boolean;
  error?: string;
}

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);
const DAY_MS = 86_400_000;
const TRUE_WORDS = new Set(['yes', 'y', 'true', '1', 'enabled', 'active']);
const FALSE_WORDS = new Set(['no', 'n', 'false', '0', 'disabled', 'inactive']);

export function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9+-]/g, '');
}

export function rawToText(raw: RawCell): string {
  if (raw === undefined || raw === null) return '';
  if (raw instanceof Date) return isoFromDate(raw) ?? '';
  if (typeof raw === 'number') return Number.isFinite(raw) ? String(raw) : '';
  return String(raw).replace(/\s+/g, ' ').trim();
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function isoFromParts(year: number, month: number, day: number): string | undefined {
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1) return undefined;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return undefined;
  return `${year}-${pad(month)}-${pad(day)}`;
}

function isoFromDate(date: Date): string | undefined {
  if (Number.isNaN(date.getTime())) return undefined;
  return isoFromParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function parseDate(raw: RawCell): string | undefined {
  if (raw instanceof Date) return isoFromDate(raw);
  if (typeof raw === 'number') {
    if (raw < 1 || raw > 2_958_465) return undefined;
    return isoFromDate(new Date(EXCEL_EPOCH_MS + Math.floor(raw) * DAY_MS));
  }
  const text = rawToText(raw).toLowerCase();

  const ymd = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[t ].*)?$/);
  if (ymd) return isoFromParts(+ymd[1], +ymd[2], +ymd[3]);

  const dmy = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmy) return isoFromParts(+dmy[3], +dmy[2], +dmy[1]);

  const named = text.match(/^(\d{1,2})[-/ .]+([a-z]{3,9})[-/ .,]+(\d{4})$/);
  if (named) {
    const month = MONTHS[named[2].slice(0, 3)];
    return month ? isoFromParts(+named[3], month, +named[1]) : undefined;
  }
  return undefined;
}

export function parsePhone(raw: RawCell): string | undefined {
  let digits = rawToText(raw).replace(/[\s\-().]/g, '');
  if (digits.startsWith('+91')) digits = digits.slice(3);
  else if (/^91\d{10}$/.test(digits)) digits = digits.slice(2);
  else if (/^0\d{10}$/.test(digits)) digits = digits.slice(1);
  return REGEX.PHONE_IN.test(digits) ? digits : undefined;
}

export function parseAmount(raw: RawCell): number | undefined {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : undefined;
  const text = rawToText(raw)
    .replace(/^(rs\.?|inr)\s*/i, '')
    .replace(/[₹,\s]/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(text)) return undefined;
  return Number(text);
}

export function matchOption(options: ColumnOption[], text: string): ColumnOption | undefined {
  const key = normalizeKey(text);
  if (!key) return undefined;
  return options.find((o) =>
    [o.value, o.label, ...(o.aliases ?? [])].some((candidate) => normalizeKey(candidate) === key),
  );
}

export function parseCell(column: ImportColumn, raw: RawCell): ParsedCell {
  const text = rawToText(raw);
  if (!text) {
    return column.required ? { error: `${column.header} is required` } : {};
  }

  switch (column.kind) {
    case 'date': {
      const value = parseDate(raw);
      return value
        ? { value }
        : { error: `'${text}' is not a valid date — use YYYY-MM-DD or DD-MM-YYYY` };
    }
    case 'phone': {
      const value = parsePhone(raw);
      return value
        ? { value }
        : { error: `'${text}' is not a valid 10-digit Indian mobile number` };
    }
    case 'email': {
      const value = text.toLowerCase();
      return REGEX.EMAIL.test(value) ? { value } : { error: `'${text}' is not a valid email` };
    }
    case 'amount': {
      const value = parseAmount(raw);
      if (value === undefined) return { error: `'${text}' is not a valid amount` };
      if (value < 0) return { error: `${column.header} cannot be negative` };
      if (Math.round(value * 100) !== value * 100) {
        return { error: `${column.header} can have at most 2 decimal places` };
      }
      return { value };
    }
    case 'enum': {
      const option = matchOption(column.options ?? [], text);
      if (option) return { value: option.value };
      const allowed = (column.options ?? []).map((o) => o.label);
      const preview = allowed.slice(0, 8).join(', ') + (allowed.length > 8 ? ', …' : '');
      return {
        error: allowed.length
          ? `'${text}' is not a valid ${column.header} — choose one of: ${preview}`
          : `No ${column.header} options are set up yet — add them in the app first`,
      };
    }
    case 'boolean': {
      const key = normalizeKey(text);
      if (TRUE_WORDS.has(key)) return { value: true };
      if (FALSE_WORDS.has(key)) return { value: false };
      return { error: `'${text}' must be Yes or No` };
    }
    case 'digits': {
      const value = text.replace(/[\s-]/g, '');
      if (!/^\d+$/.test(value)) return { error: `${column.header} must contain digits only` };
      if (column.length && value.length !== column.length) {
        return { error: `${column.header} must be exactly ${column.length} digits` };
      }
      if (column.maxLength && value.length > column.maxLength) {
        return { error: `${column.header} can have at most ${column.maxLength} digits` };
      }
      return { value };
    }
    default: {
      if (column.maxLength && text.length > column.maxLength) {
        return { error: `${column.header} must be at most ${column.maxLength} characters` };
      }
      return { value: text };
    }
  }
}
