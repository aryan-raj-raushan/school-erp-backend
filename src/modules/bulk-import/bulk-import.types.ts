import { ClassConstructor } from 'class-transformer';

export const BULK_ENTITIES = [
  'students',
  'staff',
  'finance-accounts',
  'finance-heads',
  'finance-income',
  'finance-expenses',
] as const;

export type BulkEntity = (typeof BULK_ENTITIES)[number];

export type ColumnKind =
  | 'text'
  | 'amount'
  | 'date'
  | 'phone'
  | 'email'
  | 'enum'
  | 'boolean'
  | 'digits';

export interface ColumnOption {
  value: string;
  label: string;
  aliases?: string[];
}

/** `options` on a non-enum column only feeds the template dropdown; the importer resolves the value. */
export interface ImportColumn {
  key: string;
  header: string;
  kind: ColumnKind;
  required?: boolean;
  options?: ColumnOption[];
  maxLength?: number;
  length?: number;
  hint: string;
  width?: number;
}

export type RawCell = string | number | boolean | Date | undefined;
export type RowValues = Record<string, string>;
export type ParsedValues = Record<string, string | number | boolean | undefined>;

export type IssueSeverity = 'error' | 'warning';

export interface RowIssue {
  column?: string;
  message: string;
  severity: IssueSeverity;
}

export type RowStatus = 'ready' | 'warning' | 'error';

export interface ValidatedRow<TPayload = unknown> {
  row: number;
  values: RowValues;
  parsed: ParsedValues;
  payload?: TPayload;
  issues: RowIssue[];
}

export interface UniqueKey<TPayload> {
  label: string;
  column: string;
  severity: IssueSeverity;
  key(payload: TPayload): string | undefined;
}

export interface ReportColumn {
  key: string;
  header: string;
  required: boolean;
}

export interface ReportRow {
  row: number;
  status: RowStatus;
  values: RowValues;
  issues: RowIssue[];
}

export interface ValidationSummary {
  total: number;
  ready: number;
  warning: number;
  error: number;
}

export interface ValidationReport {
  entity: BulkEntity;
  label: string;
  file_name: string;
  columns: ReportColumn[];
  header_issues: string[];
  summary: ValidationSummary;
  rows: ReportRow[];
}

export interface PersistResult {
  id: string;
  label: string;
  credentials?: ImportCredential[];
}

export interface ImportCredential {
  row: number;
  name: string;
  phone_number: string;
  temporary_password: string;
}

export type ImportJobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface ImportRowResult {
  row: number;
  status: 'created' | 'failed';
  label: string;
  message?: string;
}

export interface ImportJob {
  job_id: string;
  entity: BulkEntity;
  status: ImportJobStatus;
  total: number;
  processed: number;
  created: number;
  failed: number;
  skipped: number;
  results: ImportRowResult[];
  credentials: ImportCredential[];
  error?: string;
  started_at: string;
  finished_at?: string;
}

export interface WorkbookSheetReport extends ValidationReport {
  sheet_name: string;
  sheet_error?: string;
}

export interface WorkbookReport {
  file_name: string;
  sheets: WorkbookSheetReport[];
  ignored_sheets: string[];
  summary: ValidationSummary;
}

export interface WorkbookJob {
  job_id: string;
  status: ImportJobStatus;
  sections: ImportJob[];
  error?: string;
  started_at: string;
  finished_at?: string;
}

export interface RowContext {
  row: number;
  values: ParsedValues;
  issue(column: string | undefined, message: string, severity?: IssueSeverity): void;
}

/** Records earlier workbook sheets will create, so later sheets can reference them in the preview. */
export interface PendingRecords {
  accounts: { name: string; is_enabled: boolean; opening_balance: number; start_date: string }[];
  heads: { name: string; head_type: string; is_enabled: boolean }[];
  staff: { phone_number: string; employee_code?: string; name: string }[];
  students: { admission_number: string; name: string }[];
}

export interface BulkImporter<TCtx = unknown, TPayload extends object = object> {
  readonly entity: BulkEntity;
  readonly label: string;
  readonly dto: ClassConstructor<TPayload>;
  readonly fieldColumns: Record<string, string>;
  readonly uniqueKeys: UniqueKey<TPayload>[];
  loadContext(schoolId: string): Promise<TCtx>;
  columns(ctx: TCtx): ImportColumn[];
  examples(ctx: TCtx): RowValues[];
  notes(ctx: TCtx): string[];
  toPayload(row: RowContext, ctx: TCtx): TPayload | undefined;
  checkExisting(rows: ValidatedRow<TPayload>[], ctx: TCtx, schoolId: string): Promise<void>;
  persistOrder?(rows: ValidatedRow<TPayload>[]): ValidatedRow<TPayload>[];
  collectPending?(rows: ValidatedRow<TPayload>[], pending: PendingRecords): void;
  applyPending?(ctx: TCtx, pending: PendingRecords): void;
  persist(payload: TPayload, schoolId: string, userId: string, row: number): Promise<PersistResult>;
}
