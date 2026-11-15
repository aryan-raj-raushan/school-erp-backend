import * as ExcelJS from 'exceljs';
import { BULK_IMPORT } from '../bulk-import.constants';
import { ImportColumn, ReportRow, RowIssue, RowStatus, RowValues } from '../bulk-import.types';

interface ValidationTarget {
  dataValidations: { add(address: string, validation: ExcelJS.DataValidation): void };
}

const COLORS = {
  requiredHeader: 'FF1E3A8A',
  optionalHeader: 'FFE5E7EB',
  white: 'FFFFFFFF',
  dark: 'FF111827',
  example: 'FFECFDF5',
  error: 'FFFDE2E2',
  warning: 'FFFEF3C7',
  ready: 'FFD1FAE5',
};

const STATUS_LABEL: Record<RowStatus, string> = {
  ready: 'Ready',
  warning: 'Warning',
  error: 'Error',
};

const DATA_ROWS = BULK_IMPORT.MAX_ROWS + 1;
const MAX_LISTED_OPTIONS = 40;

function fill(argb: string): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function headerLabel(column: ImportColumn): string {
  return column.required ? `${column.header} *` : column.header;
}

function formatLabel(column: ImportColumn): string {
  switch (column.kind) {
    case 'date':
      return 'Date (YYYY-MM-DD or DD-MM-YYYY)';
    case 'phone':
      return '10-digit mobile number';
    case 'email':
      return 'Email address';
    case 'enum':
      return 'Choose from the dropdown';
    case 'boolean':
      return 'Yes / No';
    case 'digits':
      return column.length ? `${column.length} digits` : 'Digits only';
    case 'amount':
      return 'Number ≥ 0, up to 2 decimals';
    default:
      return column.maxLength ? `Text (max ${column.maxLength} characters)` : 'Text';
  }
}

function writeHeaderRow(sheet: ExcelJS.Worksheet, columns: ImportColumn[], withNotes: boolean) {
  const header = sheet.getRow(1);
  header.height = 30;
  columns.forEach((column, index) => {
    const cell = header.getCell(index + 1);
    cell.value = headerLabel(column);
    cell.font = { bold: true, color: { argb: column.required ? COLORS.white : COLORS.dark } };
    cell.fill = fill(column.required ? COLORS.requiredHeader : COLORS.optionalHeader);
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    if (withNotes) cell.note = column.hint;
    sheet.getColumn(index + 1).width = column.width ?? Math.max(16, headerLabel(column).length + 6);
  });
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

function applyColumnRules(
  sheet: ExcelJS.Worksheet,
  columns: ImportColumn[],
  listRanges: Map<string, string>,
) {
  const target = sheet as unknown as ValidationTarget;
  columns.forEach((column, index) => {
    const sheetColumn = sheet.getColumn(index + 1);
    const range = `${sheetColumn.letter}2:${sheetColumn.letter}${DATA_ROWS}`;
    const base = {
      allowBlank: !column.required,
      showInputMessage: true,
      promptTitle: column.header.slice(0, 32),
      prompt: column.hint.slice(0, 250),
      showErrorMessage: true,
      errorTitle: `Invalid ${column.header}`.slice(0, 32),
    };

    if (column.kind === 'date') sheetColumn.numFmt = 'yyyy-mm-dd';
    if (column.kind === 'phone' || column.kind === 'digits' || column.kind === 'text') {
      sheetColumn.numFmt = '@';
    }
    if (column.kind === 'amount') sheetColumn.numFmt = '#,##0.00';

    const listRange = listRanges.get(column.key);
    if (listRange) {
      target.dataValidations.add(range, {
        ...base,
        type: 'list',
        formulae: [listRange],
        errorStyle: 'stop',
        error: 'Pick a value from the dropdown list.',
      });
    } else if (column.kind === 'date') {
      target.dataValidations.add(range, {
        ...base,
        type: 'date',
        operator: 'greaterThan',
        formulae: [new Date(Date.UTC(1900, 0, 1))],
        errorStyle: 'warning',
        error: 'Enter a date like 2024-06-15.',
      });
    } else if (column.kind === 'amount') {
      target.dataValidations.add(range, {
        ...base,
        type: 'decimal',
        operator: 'greaterThanOrEqual',
        formulae: [0],
        errorStyle: 'stop',
        error: 'Enter a number that is 0 or more.',
      });
    } else if (column.kind === 'digits' && column.length) {
      target.dataValidations.add(range, {
        ...base,
        type: 'textLength',
        operator: 'equal',
        formulae: [column.length],
        errorStyle: 'warning',
        error: `Must be exactly ${column.length} digits.`,
      });
    } else if (column.maxLength) {
      target.dataValidations.add(range, {
        ...base,
        type: 'textLength',
        operator: 'lessThanOrEqual',
        formulae: [column.maxLength],
        errorStyle: 'stop',
        error: `Must be at most ${column.maxLength} characters.`,
      });
    }
  });
}

function writeLists(workbook: ExcelJS.Workbook, columns: ImportColumn[]): Map<string, string> {
  const sheet = workbook.addWorksheet(BULK_IMPORT.LISTS_SHEET, { state: 'veryHidden' });
  const ranges = new Map<string, string>();
  columns
    .filter((c) => c.options?.length)
    .forEach((column, index) => {
      const sheetColumn = sheet.getColumn(index + 1);
      sheet.getCell(1, index + 1).value = column.header;
      column.options!.forEach((option, i) => {
        sheet.getCell(i + 2, index + 1).value = option.label;
      });
      const letter = sheetColumn.letter;
      ranges.set(
        column.key,
        `${BULK_IMPORT.LISTS_SHEET}!$${letter}$2:$${letter}$${column.options!.length + 1}`,
      );
    });
  return ranges;
}

function writeInstructions(
  sheet: ExcelJS.Worksheet,
  label: string,
  columns: ImportColumn[],
  notes: string[],
) {
  sheet.getColumn(1).width = 30;
  sheet.getColumn(2).width = 12;
  sheet.getColumn(3).width = 34;
  sheet.getColumn(4).width = 90;

  const title = sheet.addRow([`${label} import — how to fill this file`]);
  title.font = { bold: true, size: 14 };
  sheet.addRow([`Generated on ${new Date().toISOString().slice(0, 10)} from your school's setup.`]);
  sheet.addRow([]);

  const steps = [
    `Fill one record per row in the "${BULK_IMPORT.DATA_SHEET}" sheet. Keep the header row as it is.`,
    'Columns marked * (dark blue headers) are required.',
    'Dropdown columns only accept the listed values. They come from your current setup, so download a fresh template after adding classes, roles, accounts or heads.',
    'Dates: YYYY-MM-DD (2024-06-15) or DD-MM-YYYY (15-06-2024).',
    `Sample rows are in the "${BULK_IMPORT.EXAMPLE_SHEET}" sheet. That sheet is never imported.`,
    'After uploading you get a full preview with every problem highlighted. Nothing is saved until you confirm.',
    ...notes,
  ];
  steps.forEach((step, i) => {
    const row = sheet.addRow([`${i + 1}. ${step}`]);
    sheet.mergeCells(row.number, 1, row.number, 4);
    row.alignment = { wrapText: true, vertical: 'top' };
  });
  sheet.addRow([]);

  const head = sheet.addRow(['Column', 'Required', 'Format', 'Rules / allowed values']);
  head.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: COLORS.white } };
    cell.fill = fill(COLORS.requiredHeader);
  });

  columns.forEach((column) => {
    const options = column.options?.map((o) => o.label) ?? [];
    const listed =
      options.length > MAX_LISTED_OPTIONS
        ? `${options.slice(0, MAX_LISTED_OPTIONS).join(', ')}, … (see dropdown)`
        : options.join(', ');
    const rules = [column.hint, listed && `Allowed: ${listed}`].filter(Boolean).join('\n');
    const row = sheet.addRow([
      column.header,
      column.required ? 'Yes' : 'No',
      formatLabel(column),
      rules,
    ]);
    row.alignment = { wrapText: true, vertical: 'top' };
    if (column.required) row.getCell(2).font = { bold: true };
  });
}

function writeValues(sheet: ExcelJS.Worksheet, columns: ImportColumn[], values: RowValues) {
  return sheet.addRow(columns.map((c) => values[c.key] ?? ''));
}

export async function buildTemplate(options: {
  label: string;
  columns: ImportColumn[];
  examples: RowValues[];
  notes: string[];
}): Promise<Buffer> {
  const { label, columns, examples, notes } = options;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'School ERP';
  workbook.created = new Date();

  const instructions = workbook.addWorksheet(BULK_IMPORT.INSTRUCTIONS_SHEET);
  const data = workbook.addWorksheet(BULK_IMPORT.DATA_SHEET);
  const example = workbook.addWorksheet(BULK_IMPORT.EXAMPLE_SHEET);
  const listRanges = writeLists(workbook, columns);

  writeInstructions(instructions, label, columns, notes);

  writeHeaderRow(data, columns, true);
  applyColumnRules(data, columns, listRanges);

  writeHeaderRow(example, columns, false);
  examples.forEach((values) => {
    writeValues(example, columns, values).eachCell({ includeEmpty: true }, (cell) => {
      cell.fill = fill(COLORS.example);
    });
  });

  workbook.views = [
    { x: 0, y: 0, width: 20000, height: 12000, firstSheet: 0, activeTab: 1, visibility: 'visible' },
  ];
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function issueText(issues: RowIssue[], columns: ImportColumn[]): string {
  const headerOf = new Map(columns.map((c) => [c.key, c.header]));
  return issues
    .map((issue) => {
      const prefix = issue.column ? `${headerOf.get(issue.column) ?? issue.column}: ` : '';
      return `${issue.severity === 'error' ? '✖' : '⚠'} ${prefix}${issue.message}`;
    })
    .join('\n');
}

export async function buildReport(options: {
  columns: ImportColumn[];
  rows: ReportRow[];
}): Promise<Buffer> {
  const { columns, rows } = options;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(BULK_IMPORT.DATA_SHEET);

  writeHeaderRow(sheet, columns, true);
  const statusCol = columns.length + 1;
  const issuesCol = columns.length + 2;
  [BULK_IMPORT.STATUS_HEADER, BULK_IMPORT.ISSUES_HEADER].forEach((title, i) => {
    const cell = sheet.getRow(1).getCell(statusCol + i);
    cell.value = title;
    cell.font = { bold: true, color: { argb: COLORS.white } };
    cell.fill = fill('FF7F1D1D');
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  sheet.getColumn(statusCol).width = 14;
  sheet.getColumn(issuesCol).width = 80;
  columns.forEach((column, index) => {
    if (column.kind === 'phone' || column.kind === 'digits' || column.kind === 'text') {
      sheet.getColumn(index + 1).numFmt = '@';
    }
  });

  rows.forEach((reportRow) => {
    const excelRow = writeValues(sheet, columns, reportRow.values);
    columns.forEach((column, index) => {
      const issues = reportRow.issues.filter((i) => i.column === column.key);
      if (!issues.length) return;
      const cell = excelRow.getCell(index + 1);
      const hasError = issues.some((i) => i.severity === 'error');
      cell.fill = fill(hasError ? COLORS.error : COLORS.warning);
      cell.note = issues.map((i) => i.message).join('\n');
    });

    const status = excelRow.getCell(statusCol);
    status.value = STATUS_LABEL[reportRow.status];
    status.font = { bold: true };
    status.fill = fill(
      reportRow.status === 'error'
        ? COLORS.error
        : reportRow.status === 'warning'
          ? COLORS.warning
          : COLORS.ready,
    );
    const issuesCell = excelRow.getCell(issuesCol);
    issuesCell.value = issueText(reportRow.issues, columns);
    issuesCell.alignment = { wrapText: true, vertical: 'top' };
  });

  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: issuesCol } };
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
