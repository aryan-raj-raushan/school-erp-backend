import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { ValidationError, validateSync } from 'class-validator';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { ALLOWED_EXTENSIONS, BULK_IMPORT, BULK_IMPORT_KEYS } from './bulk-import.constants';
import {
  BulkEntity,
  BulkImporter,
  ImportColumn,
  ImportJob,
  ParsedValues,
  ReportRow,
  RowIssue,
  RowValues,
  ValidatedRow,
  ValidationReport,
} from './bulk-import.types';
import { hasErrors, rowStatus } from './bulk-import.utils';
import { parseCell, parseDate, rawToText } from './excel/cell-parsers';
import { SheetRow, UploadedSheetFile, fileExtension, readSheet } from './excel/sheet-reader';
import { buildReport, buildTemplate } from './excel/workbook-builder';
import { StudentsImporter } from './importers/students.importer';
import { StaffImporter } from './importers/staff.importer';
import { FinanceAccountsImporter } from './importers/finance-accounts.importer';
import { FinanceHeadsImporter } from './importers/finance-heads.importer';
import { FinanceIncomeImporter } from './importers/finance-income.importer';
import { FinanceExpensesImporter } from './importers/finance-expenses.importer';

type AnyImporter = BulkImporter<unknown, object>;

interface ValidationRun {
  importer: AnyImporter;
  columns: ImportColumn[];
  headerIssues: string[];
  rows: ValidatedRow<object>[];
}

export interface ExcelFile {
  buffer: Buffer;
  fileName: string;
}

function flattenValidation(errors: ValidationError[], parent = ''): [string, string][] {
  return errors.flatMap((error) => {
    const path = parent ? `${parent}.${error.property}` : error.property;
    const own: [string, string][] = error.constraints
      ? [[path, Object.values(error.constraints)[0]]]
      : [];
    return [...own, ...flattenValidation(error.children ?? [], path)];
  });
}

function messageOf(error: unknown): string {
  if (error instanceof HttpException) {
    const response = error.getResponse();
    if (typeof response === 'string') return response;
    const message = (response as { message?: string | string[] }).message;
    return Array.isArray(message) ? message.join(', ') : (message ?? error.message);
  }
  return 'Unexpected error while saving this row';
}

@Injectable()
export class BulkImportService {
  private readonly logger = new Logger(BulkImportService.name);
  private readonly importers: Map<BulkEntity, AnyImporter>;

  constructor(
    private readonly redis: RedisService,
    students: StudentsImporter,
    staff: StaffImporter,
    accounts: FinanceAccountsImporter,
    heads: FinanceHeadsImporter,
    income: FinanceIncomeImporter,
    expenses: FinanceExpensesImporter,
  ) {
    const all = [students, staff, accounts, heads, income, expenses] as unknown as AnyImporter[];
    this.importers = new Map(all.map((importer) => [importer.entity, importer]));
  }

  private importerFor(entity: BulkEntity): AnyImporter {
    const importer = this.importers.get(entity);
    if (!importer) throw new NotFoundException(`Bulk import for '${entity}' is not supported`);
    return importer;
  }

  private assertSchool(schoolId: string | undefined): asserts schoolId is string {
    if (!schoolId) throw new BadRequestException('Switch to a school before importing data');
  }

  private assertFile(file: UploadedSheetFile | undefined): asserts file is UploadedSheetFile {
    if (!file?.buffer?.length) throw new BadRequestException('Attach an Excel (.xlsx) or CSV file');
    const extension = fileExtension(file.originalname);
    if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(extension)) {
      throw new BadRequestException(
        `'${extension || file.originalname}' files are not supported — upload .xlsx or .csv`,
      );
    }
    if (file.size > BULK_IMPORT.MAX_FILE_BYTES) {
      throw new BadRequestException('The file is larger than 5 MB');
    }
  }

  async template(entity: BulkEntity, schoolId: string): Promise<ExcelFile> {
    this.assertSchool(schoolId);
    const importer = this.importerFor(entity);
    const ctx = await importer.loadContext(schoolId);
    const buffer = await buildTemplate({
      label: importer.label,
      columns: importer.columns(ctx),
      examples: importer.examples(ctx),
      notes: importer.notes(ctx),
    });
    return { buffer, fileName: `${entity}-import-template.xlsx` };
  }

  async validate(
    entity: BulkEntity,
    file: UploadedSheetFile | undefined,
    schoolId: string,
  ): Promise<ValidationReport> {
    const run = await this.run(entity, file, schoolId);
    const rows = this.toReportRows(run.rows);
    return {
      entity,
      label: run.importer.label,
      file_name: file!.originalname,
      columns: run.columns.map((c) => ({ key: c.key, header: c.header, required: !!c.required })),
      header_issues: run.headerIssues,
      summary: {
        total: rows.length,
        ready: rows.filter((r) => r.status === 'ready').length,
        warning: rows.filter((r) => r.status === 'warning').length,
        error: rows.filter((r) => r.status === 'error').length,
      },
      rows,
    };
  }

  async report(
    entity: BulkEntity,
    file: UploadedSheetFile | undefined,
    schoolId: string,
    errorsOnly: boolean,
  ): Promise<ExcelFile> {
    const run = await this.run(entity, file, schoolId);
    const rows = this.toReportRows(run.rows).filter((r) => !errorsOnly || r.status === 'error');
    if (!rows.length) throw new BadRequestException('There are no rows with errors to export');
    const buffer = await buildReport({ columns: run.columns, rows });
    return { buffer, fileName: `${entity}-import-${errorsOnly ? 'errors' : 'report'}.xlsx` };
  }

  async startImport(
    entity: BulkEntity,
    file: UploadedSheetFile | undefined,
    schoolId: string,
    userId: string,
    skipErrors: boolean,
  ): Promise<ImportJob> {
    const run = await this.run(entity, file, schoolId);
    const importable = run.rows.filter((r) => r.payload && !hasErrors(r));
    const skipped = run.rows.length - importable.length;

    if (!importable.length) {
      throw new BadRequestException(
        'No rows are ready to import — fix the errors and upload again',
      );
    }
    if (skipped && !skipErrors) {
      throw new BadRequestException(
        `${skipped} row(s) have errors. Fix them, or choose to skip rows with errors.`,
      );
    }

    const jobId = generateId();
    const lockKey = BULK_IMPORT_KEYS.lock(schoolId, entity);
    if (!(await this.redis.setnx(lockKey, jobId))) {
      throw new ConflictException(
        `Another ${run.importer.label.toLowerCase()} import is already running for this school. Wait for it to finish.`,
      );
    }
    await this.redis.expire(lockKey, BULK_IMPORT.LOCK_TTL_SECONDS);

    const job: ImportJob = {
      job_id: jobId,
      entity,
      status: 'running',
      total: importable.length,
      processed: 0,
      created: 0,
      failed: 0,
      skipped,
      results: [],
      credentials: [],
      started_at: new Date().toISOString(),
    };
    await this.saveJob(schoolId, job);

    const ordered = run.importer.persistOrder?.(importable) ?? importable;
    setImmediate(() => void this.execute(job, run.importer, ordered, schoolId, userId, lockKey));
    return job;
  }

  async getJob(entity: BulkEntity, schoolId: string, jobId: string): Promise<ImportJob> {
    const raw = await this.redis.get(BULK_IMPORT_KEYS.job(schoolId, jobId));
    if (!raw) throw new NotFoundException('Import job not found or expired');
    const job = JSON.parse(raw) as ImportJob;
    if (job.entity !== entity) throw new NotFoundException('Import job not found or expired');
    return job.status === 'running' ? { ...job, results: [], credentials: [] } : job;
  }

  private async saveJob(schoolId: string, job: ImportJob): Promise<void> {
    await this.redis.setex(
      BULK_IMPORT_KEYS.job(schoolId, job.job_id),
      BULK_IMPORT.JOB_TTL_SECONDS,
      JSON.stringify(job),
    );
  }

  private async execute(
    job: ImportJob,
    importer: AnyImporter,
    rows: ValidatedRow<object>[],
    schoolId: string,
    userId: string,
    lockKey: string,
  ): Promise<void> {
    let lastFlush = Date.now();
    try {
      for (const row of rows) {
        try {
          const result = await importer.persist(row.payload!, schoolId, userId, row.row);
          job.created++;
          job.results.push({ row: row.row, status: 'created', label: result.label });
          if (result.credentials) job.credentials.push(...result.credentials);
        } catch (error) {
          if (!(error instanceof HttpException)) {
            this.logger.error(
              `Bulk ${job.entity} row ${row.row} failed: ${(error as Error).message}`,
              (error as Error).stack,
            );
          }
          job.failed++;
          job.results.push({
            row: row.row,
            status: 'failed',
            label: `Row ${row.row}`,
            message: messageOf(error),
          });
        }
        job.processed++;
        if (Date.now() - lastFlush >= BULK_IMPORT.PROGRESS_FLUSH_MS) {
          await this.saveJob(schoolId, job);
          lastFlush = Date.now();
        }
      }
      job.status = 'completed';
    } catch (error) {
      this.logger.error(`Bulk ${job.entity} import crashed: ${(error as Error).message}`);
      job.status = 'failed';
      job.error = 'The import stopped unexpectedly. Rows saved so far are kept.';
    } finally {
      job.results.sort((a, b) => a.row - b.row);
      job.finished_at = new Date().toISOString();
      await this.saveJob(schoolId, job).catch(() => undefined);
      await this.redis.del(lockKey).catch(() => undefined);
    }
  }

  private async run(
    entity: BulkEntity,
    file: UploadedSheetFile | undefined,
    schoolId: string,
  ): Promise<ValidationRun> {
    this.assertSchool(schoolId);
    this.assertFile(file);
    const importer = this.importerFor(entity);
    const ctx = await importer.loadContext(schoolId);
    const columns = importer.columns(ctx);
    const sheet = await readSheet(file, columns);

    const rows = sheet.rows.map((sheetRow) => this.validateRow(sheetRow, columns, importer, ctx));
    this.flagInFileDuplicates(rows, importer);
    await importer.checkExisting(
      rows.filter((r) => r.payload && !hasErrors(r)),
      ctx,
      schoolId,
    );
    return { importer, columns, headerIssues: sheet.headerIssues, rows };
  }

  private validateRow(
    sheetRow: SheetRow,
    columns: ImportColumn[],
    importer: AnyImporter,
    ctx: unknown,
  ): ValidatedRow<object> {
    const issues: RowIssue[] = [];
    const parsed: ParsedValues = {};
    const values: RowValues = {};

    columns.forEach((column) => {
      const raw = sheetRow.cells[column.key];
      values[column.key] =
        column.kind === 'date' ? (parseDate(raw) ?? rawToText(raw)) : rawToText(raw);
      const cell = parseCell(column, raw);
      if (cell.error) issues.push({ column: column.key, message: cell.error, severity: 'error' });
      else parsed[column.key] = cell.value;
    });

    const payload = importer.toPayload(
      {
        row: sheetRow.row,
        values: parsed,
        issue: (column, message, severity = 'error') => issues.push({ column, message, severity }),
      },
      ctx,
    );

    const row: ValidatedRow<object> = { row: sheetRow.row, values, parsed, issues };
    if (!payload || hasErrors(row)) return row;

    const instance = plainToInstance(importer.dto, payload);
    const errors = validateSync(instance, { whitelist: true, forbidNonWhitelisted: true });
    flattenValidation(errors).forEach(([path, message]) => {
      const column = importer.fieldColumns[path];
      issues.push({ column, message: column ? message : `${path}: ${message}`, severity: 'error' });
    });
    row.payload = instance;
    return row;
  }

  private flagInFileDuplicates(rows: ValidatedRow<object>[], importer: AnyImporter): void {
    importer.uniqueKeys.forEach((unique) => {
      const firstSeen = new Map<string, number>();
      rows.forEach((row) => {
        if (!row.payload) return;
        const key = unique.key(row.payload)?.trim().toLowerCase();
        if (!key) return;
        const first = firstSeen.get(key);
        if (first === undefined) {
          firstSeen.set(key, row.row);
          return;
        }
        row.issues.push({
          column: unique.column,
          message: `Duplicate ${unique.label} — same as row ${first} in this file`,
          severity: unique.severity,
        });
      });
    });
  }

  private toReportRows(rows: ValidatedRow<object>[]): ReportRow[] {
    return rows.map((row) => ({
      row: row.row,
      status: rowStatus(row),
      values: row.values,
      issues: row.issues,
    }));
  }
}
