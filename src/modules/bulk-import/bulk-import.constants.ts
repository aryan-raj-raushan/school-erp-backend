export const BULK_IMPORT = {
  MAX_ROWS: 2000,
  MAX_FILE_BYTES: 5 * 1024 * 1024,
  DATA_SHEET: 'Data',
  EXAMPLE_SHEET: 'Example',
  INSTRUCTIONS_SHEET: 'Instructions',
  LISTS_SHEET: 'Lists',
  STATUS_HEADER: 'Import Status',
  ISSUES_HEADER: 'Import Issues',
  JOB_TTL_SECONDS: 60 * 60,
  LOCK_TTL_SECONDS: 30 * 60,
  PROGRESS_FLUSH_MS: 300,
  MIME_XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
} as const;

export const BULK_IMPORT_KEYS = {
  job: (schoolId: string, jobId: string) => `bulk_import:job:${schoolId}:${jobId}`,
  lock: (schoolId: string, entity: string) => `bulk_import:lock:${schoolId}:${entity}`,
};

export const ALLOWED_EXTENSIONS = ['.xlsx', '.csv'] as const;
