import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PermissionsService } from '../permissions/permissions.service';
import { generateId } from '../../utils/uuid.utils';
import { AppPermission, PERMISSION_REGISTRY } from '../../shared/constants/permissions.registry';
import { JwtPayload } from '../../shared/types/jwt-payload.types';
import { BULK_IMPORT } from './bulk-import.constants';
import {
  BulkEntity,
  ImportJob,
  PendingRecords,
  ValidatedRow,
  WorkbookJob,
  WorkbookReport,
  WorkbookSheetReport,
} from './bulk-import.types';
import { hasErrors } from './bulk-import.utils';
import {
  AnyImporter,
  BulkImportService,
  ExcelFile,
  SheetRun,
  emptyPending,
  messageOf,
} from './bulk-import.service';
import { normalizeKey } from './excel/cell-parsers';
import { UploadedSheetFile, loadWorkbook, readWorksheet } from './excel/sheet-reader';
import { buildReport, buildTemplate } from './excel/workbook-builder';

interface WorkbookSheetSpec {
  entity: BulkEntity;
  sheetName: string;
  aliases: string[];
  permission: AppPermission;
}

/** Import order: later sheets may reference records created by earlier ones. */
export const WORKBOOK_SHEETS: WorkbookSheetSpec[] = [
  {
    entity: 'finance-accounts',
    sheetName: 'Finance Accounts',
    aliases: ['Accounts'],
    permission: PERMISSION_REGISTRY.finance.create,
  },
  {
    entity: 'finance-heads',
    sheetName: 'Finance Heads',
    aliases: ['Heads', 'Income & Expense Heads', 'Income Expense Heads'],
    permission: PERMISSION_REGISTRY.finance.create,
  },
  {
    entity: 'staff',
    sheetName: 'Staff',
    aliases: ['Teachers', 'Employees', 'Staff & Teachers'],
    permission: PERMISSION_REGISTRY.staff.create,
  },
  {
    entity: 'students',
    sheetName: 'Students',
    aliases: ['Student'],
    permission: PERMISSION_REGISTRY.students.create,
  },
  {
    entity: 'finance-income',
    sheetName: 'Income',
    aliases: ['Income Entries'],
    permission: PERMISSION_REGISTRY.finance.create,
  },
  {
    entity: 'finance-expenses',
    sheetName: 'Expenses',
    aliases: ['Expense', 'Expense Entries'],
    permission: PERMISSION_REGISTRY.finance.create,
  },
];

const NON_DATA_SHEETS = new Set(
  [BULK_IMPORT.INSTRUCTIONS_SHEET, BULK_IMPORT.EXAMPLE_SHEET, BULK_IMPORT.LISTS_SHEET].map(
    normalizeKey,
  ),
);

interface AnalysedSheet {
  spec: WorkbookSheetSpec;
  worksheet: ExcelJS.Worksheet;
  importer: AnyImporter;
  run?: SheetRun;
  error?: string;
}

interface Analysis {
  sheets: AnalysedSheet[];
  ignored: string[];
}

function matchesSheet(spec: WorkbookSheetSpec, name: string): boolean {
  const key = normalizeKey(name);
  return [spec.sheetName, spec.entity, ...spec.aliases].some((n) => normalizeKey(n) === key);
}

@Injectable()
export class BulkImportWorkbookService {
  private readonly logger = new Logger(BulkImportWorkbookService.name);

  constructor(
    private readonly bulkImport: BulkImportService,
    private readonly permissions: PermissionsService,
  ) {}

  private async allowedSpecs(user: JwtPayload, schoolId: string): Promise<Set<BulkEntity>> {
    const granted = await this.permissions.grantedPermissions(user, schoolId);
    return new Set(
      WORKBOOK_SHEETS.filter((s) => granted === 'all' || granted.includes(s.permission)).map(
        (s) => s.entity,
      ),
    );
  }

  async template(user: JwtPayload, schoolId: string): Promise<ExcelFile> {
    this.bulkImport.assertSchool(schoolId);
    const allowed = await this.allowedSpecs(user, schoolId);
    const specs = WORKBOOK_SHEETS.filter((s) => allowed.has(s.entity));
    if (!specs.length) throw new ForbiddenException('You are not allowed to import any data');

    const sections = await Promise.all(
      specs.map(async (spec) => {
        const importer = this.bulkImport.importerFor(spec.entity);
        const ctx = await importer.loadContext(schoolId);
        return {
          label: importer.label,
          sheetName: spec.sheetName,
          columns: importer.columns(ctx),
          examples: importer.examples(ctx),
          notes: importer.notes(ctx),
        };
      }),
    );
    const buffer = await buildTemplate({ title: 'School data import', sections });
    return { buffer, fileName: 'school-data-import-template.xlsx' };
  }

  async validate(
    user: JwtPayload,
    file: UploadedSheetFile | undefined,
    schoolId: string,
  ): Promise<WorkbookReport> {
    const analysis = await this.analyse(user, file, schoolId);
    const sheets = analysis.sheets.map((s) => this.toSheetReport(s, file!.originalname));
    return {
      file_name: file!.originalname,
      sheets,
      ignored_sheets: analysis.ignored,
      summary: this.bulkImport.summarize(sheets.flatMap((s) => s.rows)),
    };
  }

  async report(
    user: JwtPayload,
    file: UploadedSheetFile | undefined,
    schoolId: string,
    errorsOnly: boolean,
  ): Promise<ExcelFile> {
    const analysis = await this.analyse(user, file, schoolId);
    const sections = analysis.sheets
      .filter((s) => s.run)
      .map((s) => ({
        sheetName: s.worksheet.name,
        columns: s.run!.columns,
        rows: this.bulkImport
          .toReportRows(s.run!.rows)
          .filter((r) => !errorsOnly || r.status === 'error'),
      }))
      .filter((s) => s.rows.length);
    if (!sections.length) throw new BadRequestException('There are no rows with errors to export');
    const buffer = await buildReport(sections);
    return {
      buffer,
      fileName: `school-data-import-${errorsOnly ? 'errors' : 'report'}.xlsx`,
    };
  }

  async startImport(
    user: JwtPayload,
    file: UploadedSheetFile | undefined,
    schoolId: string,
    userId: string,
    skipErrors: boolean,
  ): Promise<WorkbookJob> {
    const analysis = await this.analyse(user, file, schoolId);
    const usable = analysis.sheets.filter((s) => s.run?.rows.length);
    const importable = usable.map((s) => this.bulkImport.importable(s.run!.rows));
    const importableTotal = importable.reduce((sum, rows) => sum + rows.length, 0);
    const errorTotal = usable.reduce(
      (sum, s) => sum + s.run!.rows.filter((r) => hasErrors(r)).length,
      0,
    );

    if (!importableTotal) {
      throw new BadRequestException(
        'No rows are ready to import — fix the errors and upload again',
      );
    }
    if (errorTotal && !skipErrors) {
      throw new BadRequestException(
        `${errorTotal} row(s) have errors. Fix them, or choose to skip rows with errors.`,
      );
    }

    const jobId = generateId();
    const locks = await this.bulkImport.acquireLocks(
      schoolId,
      usable.map((s) => s.spec.entity),
      jobId,
    );
    const job: WorkbookJob = {
      job_id: jobId,
      status: 'running',
      sections: usable.map((s, i) =>
        this.bulkImport.newJob(
          s.spec.entity,
          jobId,
          'pending',
          importable[i].length,
          s.run!.rows.length - importable[i].length,
        ),
      ),
      started_at: new Date().toISOString(),
    };
    await this.bulkImport.saveJob(schoolId, jobId, job);

    const approved = importable.map((rows) => new Set(rows.map((r) => r.row)));
    setImmediate(() => void this.execute(job, usable, approved, schoolId, userId, locks));
    return job;
  }

  async getJob(schoolId: string, jobId: string): Promise<WorkbookJob> {
    const job = await this.bulkImport.loadJob<WorkbookJob>(schoolId, jobId);
    if (!Array.isArray(job.sections))
      throw new NotFoundException('Import job not found or expired');
    if (job.status !== 'running') return job;
    return {
      ...job,
      sections: job.sections.map((s) =>
        s.status === 'completed' ? s : { ...s, results: [], credentials: [] },
      ),
    };
  }

  /**
   * Each sheet is re-validated against the live database right before it is saved, so rows that
   * referenced records from earlier sheets now resolve to the real ids. Only rows the user approved
   * in the preview are saved; any that no longer pass are reported as failed with the reason.
   */
  private async execute(
    job: WorkbookJob,
    sheets: AnalysedSheet[],
    approved: Set<number>[],
    schoolId: string,
    userId: string,
    locks: string[],
  ): Promise<void> {
    const flush = () => this.bulkImport.saveJob(schoolId, job.job_id, job);
    let current: ImportJob | undefined;
    try {
      for (let i = 0; i < sheets.length; i++) {
        current = job.sections[i];
        current.status = 'running';
        await flush();

        const { importer, worksheet } = sheets[i];
        const fresh = await this.runWorksheet(importer, worksheet, schoolId);
        const toSave: ValidatedRow<object>[] = [];
        fresh.rows
          .filter((r) => approved[i].has(r.row))
          .forEach((row) => {
            if (row.payload && !hasErrors(row)) {
              toSave.push(row);
              return;
            }
            current!.failed++;
            current!.processed++;
            current!.results.push({
              row: row.row,
              status: 'failed',
              label: `Row ${row.row}`,
              message: row.issues
                .filter((issue) => issue.severity === 'error')
                .map((issue) => issue.message)
                .join('; '),
            });
          });

        const ordered = importer.persistOrder?.(toSave) ?? toSave;
        await this.bulkImport.persistRows(current, importer, ordered, schoolId, userId, flush);
        current.status = 'completed';
        current.finished_at = new Date().toISOString();
      }
      job.status = 'completed';
    } catch (error) {
      this.logger.error(`Workbook import crashed: ${(error as Error).message}`);
      job.status = 'failed';
      job.error = 'The import stopped unexpectedly. Rows saved so far are kept.';
      job.sections
        .filter((s) => s.status !== 'completed')
        .forEach((s) => {
          s.status = 'failed';
          s.error =
            s === current
              ? `Stopped while saving: ${messageOf(error)}`
              : 'Not imported because an earlier sheet stopped';
        });
    } finally {
      job.finished_at = new Date().toISOString();
      await flush().catch(() => undefined);
      await this.bulkImport.releaseLocks(locks);
    }
  }

  private async analyse(
    user: JwtPayload,
    file: UploadedSheetFile | undefined,
    schoolId: string,
  ): Promise<Analysis> {
    this.bulkImport.assertSchool(schoolId);
    this.bulkImport.assertFile(file, ['.xlsx']);
    const [allowed, workbook] = await Promise.all([
      this.allowedSpecs(user, schoolId),
      loadWorkbook(file),
    ]);

    const matched = new Set<ExcelJS.Worksheet>();
    const pending = emptyPending();
    const sheets: AnalysedSheet[] = [];

    for (const spec of WORKBOOK_SHEETS) {
      const worksheet = workbook.worksheets.find(
        (ws) => !matched.has(ws) && matchesSheet(spec, ws.name),
      );
      if (!worksheet) continue;
      matched.add(worksheet);
      const importer = this.bulkImport.importerFor(spec.entity);

      if (!allowed.has(spec.entity)) {
        sheets.push({
          spec,
          worksheet,
          importer,
          error: `You don't have permission to import ${importer.label.toLowerCase()} — this sheet will be skipped`,
        });
        continue;
      }
      try {
        const run = await this.runWorksheet(importer, worksheet, schoolId, pending);
        importer.collectPending?.(this.bulkImport.importable(run.rows), pending);
        sheets.push({ spec, worksheet, importer, run });
      } catch (error) {
        if (!(error instanceof HttpException)) throw error;
        sheets.push({ spec, worksheet, importer, error: messageOf(error) });
      }
    }

    const ignored = workbook.worksheets
      .filter(
        (ws) =>
          !matched.has(ws) && ws.state === 'visible' && !NON_DATA_SHEETS.has(normalizeKey(ws.name)),
      )
      .map((ws) => ws.name);

    if (!sheets.length) {
      throw new BadRequestException(
        `No recognised sheets found. Name your sheets ${WORKBOOK_SHEETS.map((s) => `'${s.sheetName}'`).join(', ')} — or download the template.`,
      );
    }
    return { sheets, ignored };
  }

  private async runWorksheet(
    importer: AnyImporter,
    worksheet: ExcelJS.Worksheet,
    schoolId: string,
    pending?: PendingRecords,
  ): Promise<SheetRun> {
    const ctx = await importer.loadContext(schoolId);
    if (pending) importer.applyPending?.(ctx, pending);
    const columns = importer.columns(ctx);
    const data =
      worksheet.actualRowCount === 0
        ? { rows: [], headerIssues: [] }
        : readWorksheet(worksheet, columns);
    return this.bulkImport.runSheet(importer, ctx, columns, data, schoolId);
  }

  private toSheetReport(sheet: AnalysedSheet, fileName: string): WorkbookSheetReport {
    if (sheet.run) {
      return {
        ...this.bulkImport.toReport(sheet.spec.entity, sheet.run, fileName),
        sheet_name: sheet.worksheet.name,
      };
    }
    return {
      entity: sheet.spec.entity,
      label: sheet.importer.label,
      file_name: fileName,
      sheet_name: sheet.worksheet.name,
      sheet_error: sheet.error,
      columns: [],
      header_issues: [],
      summary: { total: 0, ready: 0, warning: 0, error: 0 },
      rows: [],
    };
  }
}
