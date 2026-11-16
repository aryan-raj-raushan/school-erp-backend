import { describe, expect, it } from '@jest/globals';
import * as ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { loadWorkbook } from './sheet-reader';

async function workbookWithAbsoluteNoteTargets(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Data');
  sheet.addRow(['First Name']);
  sheet.addRow(['Asha']);
  sheet.getCell('A1').note = 'Required';
  const original = Buffer.from(await workbook.xlsx.writeBuffer());

  const zip = await JSZip.loadAsync(original);
  for (const rels of zip.file(/^xl\/worksheets\/_rels\/.+\.rels$/)) {
    const xml = await rels.async('string');
    zip.file(rels.name, xml.replace(/Target="\.\.\//g, 'Target="/xl/'));
  }
  return zip.generateAsync({ type: 'nodebuffer' });
}

describe('loadWorkbook', () => {
  it('reads a template re-saved with absolute cell-note targets', async () => {
    const buffer = await workbookWithAbsoluteNoteTargets();
    await expect(
      new ExcelJS.Workbook().xlsx.load(buffer as unknown as ExcelJS.Buffer),
    ).rejects.toThrow();

    const workbook = await loadWorkbook({
      buffer,
      originalname: 'students.xlsx',
      size: buffer.length,
    });

    expect(workbook.getWorksheet('Data')?.getCell('A2').value).toBe('Asha');
  });
});
