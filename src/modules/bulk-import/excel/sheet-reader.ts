import { BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { Readable } from 'stream';
import { BULK_IMPORT } from '../bulk-import.constants';
import { ImportColumn, RawCell } from '../bulk-import.types';
import { normalizeKey, rawToText } from './cell-parsers';

export interface UploadedSheetFile {
  buffer: Buffer;
  originalname: string;
  size: number;
}

export interface SheetRow {
  row: number;
  cells: Record<string, RawCell>;
}

export interface SheetData {
  rows: SheetRow[];
  headerIssues: string[];
}

const HEADER_SCAN_ROWS = 10;
const IGNORED_HEADERS = new Set(
  [BULK_IMPORT.STATUS_HEADER, BULK_IMPORT.ISSUES_HEADER, 'Row'].map(normalizeKey),
);
const NON_DATA_SHEETS = new Set(
  [BULK_IMPORT.INSTRUCTIONS_SHEET, BULK_IMPORT.EXAMPLE_SHEET, BULK_IMPORT.LISTS_SHEET].map((name) =>
    name.toLowerCase(),
  ),
);

function headerKey(text: string): string {
  return normalizeKey(text.replace(/\(.*?\)/g, '').replace(/\*/g, ''));
}

export function toRawCell(value: ExcelJS.CellValue): RawCell {
  if (value === null || value === undefined) return undefined;
  if (value instanceof Date || typeof value !== 'object') return value as RawCell;
  if ('richText' in value) return value.richText.map((part) => part.text).join('');
  if ('error' in value) return undefined;
  if ('result' in value) return toRawCell(value.result as ExcelJS.CellValue);
  if ('text' in value) return toRawCell(value.text as ExcelJS.CellValue);
  return undefined;
}

export function fileExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot).toLowerCase();
}

export async function loadWorkbook(file: UploadedSheetFile): Promise<ExcelJS.Workbook> {
  try {
    if (fileExtension(file.originalname) === '.csv') {
      const workbook = new ExcelJS.Workbook();
      await workbook.csv.read(Readable.from(file.buffer), { map: (value: unknown) => value });
      return workbook;
    }
    return await loadXlsx(file.buffer);
  } catch {
    throw new BadRequestException(
      'The file could not be read. Save it as .xlsx (Excel Workbook) or .csv and try again.',
    );
  }
}

async function loadXlsx(buffer: Buffer): Promise<ExcelJS.Workbook> {
  try {
    return await xlsxWorkbook(buffer);
  } catch {
    return xlsxWorkbook(await withoutCellNotes(buffer));
  }
}

async function xlsxWorkbook(buffer: Buffer): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  return workbook;
}

const SHEET_RELS_PATH = /^xl\/worksheets\/_rels\/[^/]+\.rels$/;
const NOTE_RELATIONSHIP = /<Relationship\b[^>]*\/relationships\/(?:comments|vmlDrawing)"[^>]*\/>/g;

// exceljs cannot resolve absolute comment targets, which openpyxl, Google Sheets and LibreOffice
// write when they re-save our template. Cell notes hold no import data, so unlink them and retry.
async function withoutCellNotes(buffer: Buffer): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buffer);
  const relsFiles = zip.file(SHEET_RELS_PATH);
  await Promise.all(
    relsFiles.map(async (rels) => {
      const xml = await rels.async('string');
      zip.file(rels.name, xml.replace(NOTE_RELATIONSHIP, ''));
    }),
  );
  return zip.generateAsync({ type: 'nodebuffer' });
}

function pickSheet(workbook: ExcelJS.Workbook): ExcelJS.Worksheet {
  const sheet =
    workbook.getWorksheet(BULK_IMPORT.DATA_SHEET) ??
    workbook.worksheets.find(
      (ws) => ws.state === 'visible' && !NON_DATA_SHEETS.has(ws.name.toLowerCase()),
    );
  if (!sheet) throw new BadRequestException('No data sheet found in the file');
  return sheet;
}

export async function readSheet(
  file: UploadedSheetFile,
  columns: ImportColumn[],
): Promise<SheetData> {
  const data = readWorksheet(pickSheet(await loadWorkbook(file)), columns);
  if (data.rows.length === 0) {
    throw new BadRequestException('The file has no data rows below the header');
  }
  return data;
}

/** Reads one worksheet; an empty sheet yields no rows rather than an error. */
export function readWorksheet(sheet: ExcelJS.Worksheet, columns: ImportColumn[]): SheetData {
  const byHeader = new Map<string, ImportColumn>();
  columns.forEach((c) => {
    byHeader.set(headerKey(c.header), c);
    byHeader.set(headerKey(c.key), c);
  });

  let headerRow = 0;
  for (let r = 1; r <= Math.min(HEADER_SCAN_ROWS, sheet.rowCount); r++) {
    const values = sheet.getRow(r).values as ExcelJS.CellValue[];
    if (values.some((v) => byHeader.has(headerKey(rawToText(toRawCell(v)))))) {
      headerRow = r;
      break;
    }
  }
  if (!headerRow) {
    throw new BadRequestException(
      `Could not find the header row in sheet '${sheet.name}'. Download the sample template and keep its first row unchanged.`,
    );
  }

  const headerIssues: string[] = [];
  const columnAt = new Map<number, ImportColumn>();
  const seen = new Set<string>();
  sheet.getRow(headerRow).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const text = rawToText(toRawCell(cell.value));
    const key = headerKey(text);
    if (!key || IGNORED_HEADERS.has(key)) return;
    const column = byHeader.get(key);
    if (!column) {
      headerIssues.push(`Column '${text}' is not recognised and was ignored`);
      return;
    }
    if (seen.has(column.key)) {
      headerIssues.push(
        `Column '${column.header}' appears more than once — only the first is used`,
      );
      return;
    }
    seen.add(column.key);
    columnAt.set(colNumber, column);
  });

  columns
    .filter((c) => c.required && !seen.has(c.key))
    .forEach((c) => headerIssues.unshift(`Required column '${c.header}' is missing`));

  const rows: SheetRow[] = [];
  for (let r = headerRow + 1; r <= sheet.rowCount; r++) {
    const excelRow = sheet.getRow(r);
    const cells: Record<string, RawCell> = {};
    let hasValue = false;
    columnAt.forEach((column, colNumber) => {
      const raw = toRawCell(excelRow.getCell(colNumber).value);
      if (rawToText(raw)) hasValue = true;
      cells[column.key] = raw;
    });
    if (!hasValue) continue;
    rows.push({ row: r, cells });
    if (rows.length > BULK_IMPORT.MAX_ROWS) {
      throw new BadRequestException(
        `Sheet '${sheet.name}' has more than ${BULK_IMPORT.MAX_ROWS} rows. Split it into smaller files.`,
      );
    }
  }
  return { rows, headerIssues };
}
