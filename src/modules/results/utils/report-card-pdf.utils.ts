import PDFDocument from 'pdfkit';
import { ReportCardPdfData } from '../types/exam-result.types';

// ─── Colour palette (warm amber / gold — matches reference image) ─────────────
const AMBER_HEADER = '#D4A044';
const AMBER_LIGHT = '#F5D99E';
const AMBER_MID = '#E8B95A';
const BLACK = '#000000';
const DARK_GREY = '#333333';
const MID_GREY = '#666666';
const LIGHT_GREY = '#cccccc';
const WHITE = '#ffffff';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hr(doc: PDFKit.PDFDocument, y: number, x1 = 40, x2?: number, color = DARK_GREY, lw = 0.5) {
  doc
    .moveTo(x1, y)
    .lineTo(x2 ?? doc.page.width - 40, y)
    .strokeColor(color)
    .lineWidth(lw)
    .stroke();
}

function cell(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  bg?: string,
  stroke = DARK_GREY,
  lw = 0.5,
) {
  if (bg) doc.rect(x, y, w, h).fillColor(bg).fill();
  doc.rect(x, y, w, h).strokeColor(stroke).lineWidth(lw).stroke();
}

function text(
  doc: PDFKit.PDFDocument,
  str: string,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: {
    font?: string;
    size?: number;
    color?: string;
    align?: 'left' | 'center' | 'right';
    valign?: 'top' | 'middle';
  } = {},
) {
  const { font = 'Helvetica', size = 8, color = BLACK, align = 'left', valign = 'middle' } = opts;
  const textH = size * 1.2;
  const ty = valign === 'middle' ? y + (h - textH) / 2 : y + 2;
  doc
    .font(font)
    .fontSize(size)
    .fillColor(color)
    .text(str, x + 3, ty, { width: w - 6, align });
}

// ─── School header ────────────────────────────────────────────────────────────

function schoolHeader(
  doc: PDFKit.PDFDocument,
  school: ReportCardPdfData['school'],
  margin = 40,
): number {
  const pageW = doc.page.width;
  const centerX = pageW / 2;
  let y = 30;

  // Logo box
  doc.rect(margin, y, 65, 65).strokeColor(LIGHT_GREY).lineWidth(1).stroke();
  doc
    .fontSize(7)
    .fillColor('#aaaaaa')
    .font('Helvetica')
    .text('SCHOOL\nLOGO', margin + 4, y + 22, { width: 57, align: 'center' });

  // Centre text block
  if (school.tagline) {
    doc
      .font('Helvetica-Oblique')
      .fontSize(8)
      .fillColor(MID_GREY)
      .text(`"${school.tagline}"`, centerX - 160, y + 2, { width: 320, align: 'center' });
  }
  doc
    .font('Helvetica-Bold')
    .fontSize(18)
    .fillColor(BLACK)
    .text(school.name.toUpperCase(), centerX - 160, y + 14, { width: 320, align: 'center' });
  if (school.address) {
    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor('#444444')
      .text(school.address, centerX - 160, y + 36, { width: 320, align: 'center' });
  }

  // Phone (right)
  if (school.contact_number) {
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(BLACK)
      .text(`☎  ${school.contact_number}`, pageW - margin - 110, y + 20, {
        width: 110,
        align: 'right',
      });
  }

  y += 70;
  hr(doc, y, margin, pageW - margin, AMBER_HEADER, 1.5);
  y += 6;

  // "REPORT CARD" title
  doc
    .font('Helvetica-Bold')
    .fontSize(13)
    .fillColor(BLACK)
    .text('REPORT CARD', margin, y, { width: pageW - margin * 2, align: 'center' });
  y += 18;

  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(MID_GREY)
    .text(`Class: ${school.name.includes('Class') ? '' : ''}`, margin, y, {
      width: pageW - margin * 2,
      align: 'center',
    });

  return y + 14;
}

// ─── Student info table ───────────────────────────────────────────────────────

function studentInfoTable(
  doc: PDFKit.PDFDocument,
  data: ReportCardPdfData,
  y: number,
  margin = 40,
): number {
  const pageW = doc.page.width;
  const tableW = pageW - margin * 2;
  const photoW = 75;
  const dataW = tableW - photoW;
  const rowH = 22;
  const col1W = dataW * 0.22;
  const col2W = dataW * 0.28;
  const col3W = dataW * 0.22;
  const col4W = dataW * 0.28;

  const rows = [
    ['Name:', data.student.name, 'DOB:', data.student.date_of_birth],
    ["Father's Name:", data.student.father_name, "Mother's Name:", data.student.mother_name],
    ['Session:', data.academic_year, 'Section:', data.student.section],
    ['Roll No:', data.student.roll_number, 'Reg No:', data.student.registration_number],
  ];

  const startY = y;

  rows.forEach((row, i) => {
    const rowY = startY + i * rowH;
    // col1 – label
    cell(doc, margin, rowY, col1W, rowH, AMBER_LIGHT);
    text(doc, row[0], margin, rowY, col1W, rowH, { font: 'Helvetica-Bold', size: 8 });
    // col2 – value
    cell(doc, margin + col1W, rowY, col2W, rowH);
    text(doc, row[1], margin + col1W, rowY, col2W, rowH, { size: 8 });
    // col3 – label
    cell(doc, margin + col1W + col2W, rowY, col3W, rowH, AMBER_LIGHT);
    text(doc, row[2], margin + col1W + col2W, rowY, col3W, rowH, {
      font: 'Helvetica-Bold',
      size: 8,
    });
    // col4 – value
    cell(doc, margin + col1W + col2W + col3W, rowY, col4W, rowH);
    text(doc, row[3], margin + col1W + col2W + col3W, rowY, col4W, rowH, { size: 8 });
  });

  // Photo box
  const photoX = margin + dataW;
  cell(doc, photoX, startY, photoW, rowH * 4, '#f9f9f9', DARK_GREY, 1);
  doc
    .fontSize(7)
    .fillColor('#aaaaaa')
    .font('Helvetica')
    .text('Student\nPhoto', photoX + 4, startY + rowH * 1.5, {
      width: photoW - 8,
      align: 'center',
    });

  // Class / session sub-header
  const infoY = y - 22;
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(MID_GREY)
    .text(`Class: ${data.class_name}`, margin, infoY, { width: tableW / 2, align: 'center' });
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(MID_GREY)
    .text(`Academic Session : ${data.academic_year}`, margin + tableW / 2, infoY, {
      width: tableW / 2,
      align: 'center',
    });

  return startY + rows.length * rowH + 10;
}

// ─── Scholastic marks table ───────────────────────────────────────────────────

function scholasticTable(
  doc: PDFKit.PDFDocument,
  data: ReportCardPdfData,
  y: number,
  margin = 40,
): number {
  const pageW = doc.page.width;
  const tableW = pageW - margin * 2;

  // Column widths
  const subjectW = tableW * 0.16;
  const theoryTotalW = tableW * 0.1;
  const theoryScoredW = tableW * 0.1;
  const oralTotalW = tableW * 0.1;
  const oralScoredW = tableW * 0.1;
  const allTotalW = tableW * 0.12;
  const totalScoredW = tableW * 0.12;
  const gradeW =
    tableW -
    subjectW -
    theoryTotalW -
    theoryScoredW -
    oralTotalW -
    oralScoredW -
    allTotalW -
    totalScoredW;

  const headerH = 16;
  const subHeaderH = 14;
  const rowH = 18;

  // Row 1 – section header (SCHOLASTIC | Term-1 | empty)
  let cx = margin;
  cell(doc, cx, y, subjectW, headerH * 2 + subHeaderH, AMBER_HEADER);
  text(doc, 'SCHOLASTIC', cx, y, subjectW, headerH * 2 + subHeaderH, {
    font: 'Helvetica-Bold',
    size: 8,
    color: WHITE,
    align: 'center',
  });

  cx += subjectW;
  // Span "Annual Exam" over Theory+Oral columns
  const examSpanW = theoryTotalW + theoryScoredW + oralTotalW + oralScoredW;
  cell(doc, cx, y, examSpanW, headerH, AMBER_MID);
  text(doc, 'Annual Exam', cx, y, examSpanW, headerH, {
    font: 'Helvetica-Bold',
    size: 8,
    align: 'center',
  });

  // "Theory" sub-header
  cell(doc, cx, y + headerH, theoryTotalW + theoryScoredW, subHeaderH, AMBER_LIGHT);
  text(doc, 'Theory', cx, y + headerH, theoryTotalW + theoryScoredW, subHeaderH, {
    font: 'Helvetica-Bold',
    size: 7.5,
    align: 'center',
  });

  // "Oral" sub-header
  cell(
    doc,
    cx + theoryTotalW + theoryScoredW,
    y + headerH,
    oralTotalW + oralScoredW,
    subHeaderH,
    AMBER_LIGHT,
  );
  text(
    doc,
    'Oral',
    cx + theoryTotalW + theoryScoredW,
    y + headerH,
    oralTotalW + oralScoredW,
    subHeaderH,
    { font: 'Helvetica-Bold', size: 7.5, align: 'center' },
  );

  // Column labels row
  const labelsY = y + headerH + subHeaderH;
  const labels = [
    ['Total', theoryTotalW],
    ['Scored', theoryScoredW],
    ['Total', oralTotalW],
    ['Scored', oralScoredW],
  ];
  let lx = cx;
  labels.forEach(([label, w]) => {
    cell(doc, lx, labelsY, w as number, headerH, AMBER_LIGHT);
    text(doc, label as string, lx, labelsY, w as number, headerH, {
      font: 'Helvetica-Bold',
      size: 7,
      align: 'center',
    });
    lx += w as number;
  });

  // "Total" span
  cx += examSpanW;
  cell(doc, cx, y, allTotalW + totalScoredW, headerH, AMBER_HEADER);
  text(doc, 'Total', cx, y, allTotalW + totalScoredW, headerH, {
    font: 'Helvetica-Bold',
    size: 8,
    color: WHITE,
    align: 'center',
  });
  cell(doc, cx, y + headerH, allTotalW, subHeaderH + headerH, AMBER_LIGHT);
  text(doc, 'All Total', cx, y + headerH, allTotalW, subHeaderH + headerH, {
    font: 'Helvetica-Bold',
    size: 7,
    align: 'center',
  });
  cell(doc, cx + allTotalW, y + headerH, totalScoredW, subHeaderH + headerH, AMBER_LIGHT);
  text(doc, 'Total Scored', cx + allTotalW, y + headerH, totalScoredW, subHeaderH + headerH, {
    font: 'Helvetica-Bold',
    size: 7,
    align: 'center',
  });

  // GRADE header
  cx += allTotalW + totalScoredW;
  cell(doc, cx, y, gradeW, headerH * 2 + subHeaderH, AMBER_MID);
  text(doc, 'GRADE', cx, y, gradeW, headerH * 2 + subHeaderH, {
    font: 'Helvetica-Bold',
    size: 8,
    align: 'center',
  });

  // ── Subject rows ───────────────────────────────────────────────────────────
  y += headerH * 2 + subHeaderH;

  // Group subjects by name (main + oral share same row)
  type SubjectGroup = {
    name: string;
    theory: (typeof data.subjects)[0] | null;
    oral: (typeof data.subjects)[0] | null;
  };
  const grouped: Record<string, SubjectGroup> = {};
  data.subjects.forEach((s) => {
    const key = s.name.toUpperCase().replace(/ (ORAL|PRACTICAL)$/, '');
    if (!grouped[key]) grouped[key] = { name: key, theory: null, oral: null };
    if (s.subject_type === 'ORAL_EXAM' || s.subject_type === 'PRACTICAL_EXAM') {
      grouped[key].oral = s;
    } else {
      grouped[key].theory = s;
    }
  });

  Object.values(grouped).forEach((g) => {
    const t = g.theory;
    const o = g.oral;
    cx = margin;
    cell(doc, cx, y, subjectW, rowH, AMBER_LIGHT);
    text(doc, g.name, cx, y, subjectW, rowH, { font: 'Helvetica-Bold', size: 7.5 });
    cx += subjectW;

    const theoryTotal = t ? String(t.theory_total) : '';
    const theoryScored = t
      ? t.is_absent
        ? 'Absent'
        : t.theory_scored != null
          ? String(t.theory_scored)
          : '-'
      : '';
    const oralTotal = o ? String(o.oral_total) : '';
    const oralScored = o
      ? o.is_absent
        ? 'Absent'
        : o.oral_scored != null
          ? String(o.oral_scored)
          : '-'
      : '';
    const allTotal = String((t?.theory_total ?? 0) + (o?.oral_total ?? 0));
    const allScored = String((t?.theory_scored ?? 0) + (o?.oral_scored ?? 0));
    const grade = (t ?? o)?.grade ?? '';

    const dataCols = [
      [theoryTotal, theoryTotalW],
      [theoryScored, theoryScoredW],
      [oralTotal, oralTotalW],
      [oralScored, oralScoredW],
      [allTotal, allTotalW],
      [allScored, totalScoredW],
    ];
    dataCols.forEach(([val, w]) => {
      cell(doc, cx, y, w as number, rowH);
      text(doc, val as string, cx, y, w as number, rowH, { size: 7.5, align: 'center' });
      cx += w as number;
    });
    cell(doc, cx, y, gradeW, rowH, AMBER_LIGHT);
    text(doc, grade, cx, y, gradeW, rowH, { font: 'Helvetica-Bold', size: 8, align: 'center' });
    y += rowH;
  });

  // ── Grand Total row ───────────────────────────────────────────────────────
  cell(doc, margin, y, subjectW, rowH, AMBER_HEADER);
  text(doc, 'GRAND TOTAL', margin, y, subjectW, rowH, {
    font: 'Helvetica-Bold',
    size: 7.5,
    color: WHITE,
    align: 'center',
  });
  const grandCell = tableW - subjectW - gradeW;
  cell(doc, margin + subjectW, y, grandCell, rowH, AMBER_MID);
  text(
    doc,
    `${data.grand_total_scored} out of ${data.grand_total_marks} (${data.grand_percentage} %)`,
    margin + subjectW,
    y,
    grandCell,
    rowH,
    { font: 'Helvetica-Bold', size: 9, align: 'center' },
  );
  cell(doc, margin + subjectW + grandCell, y, gradeW, rowH, AMBER_HEADER);
  text(doc, data.grand_grade, margin + subjectW + grandCell, y, gradeW, rowH, {
    font: 'Helvetica-Bold',
    size: 9,
    color: WHITE,
    align: 'center',
  });
  y += rowH + 6;

  // ── Grading scale legend ──────────────────────────────────────────────────
  cell(doc, margin, y, tableW * 0.25, rowH, AMBER_LIGHT);
  text(doc, '7 Points Grading Scale:', margin, y, tableW * 0.25, rowH, {
    font: 'Helvetica-Bold',
    size: 7.5,
  });
  cell(doc, margin + tableW * 0.25, y, tableW * 0.75, rowH);
  text(doc, data.grading_scale, margin + tableW * 0.25, y, tableW * 0.75, rowH, { size: 7 });

  return y + rowH + 8;
}

// ─── Co-Scholastic table ──────────────────────────────────────────────────────

function coScholasticTable(
  doc: PDFKit.PDFDocument,
  data: ReportCardPdfData,
  y: number,
  margin = 40,
): number {
  const pageW = doc.page.width;
  const tableW = pageW - margin * 2;
  const subjectW = tableW * 0.25;
  const detailW = tableW - subjectW;
  const rowH = 18;
  const headerH = 16;

  // Header row
  cell(doc, margin, y, subjectW, headerH * 2, AMBER_HEADER);
  text(doc, 'CO-SCHOLASTIC', margin, y, subjectW, headerH * 2, {
    font: 'Helvetica-Bold',
    size: 8,
    color: WHITE,
    align: 'center',
  });
  cell(doc, margin + subjectW, y, detailW, headerH, AMBER_HEADER);
  text(doc, 'DETAILS', margin + subjectW, y, detailW, headerH, {
    font: 'Helvetica-Bold',
    size: 8,
    color: WHITE,
    align: 'center',
  });

  // Sub-header
  cell(doc, margin, y + headerH, subjectW, headerH, AMBER_LIGHT);
  text(doc, 'SUBJECTS', margin, y + headerH, subjectW, headerH, {
    font: 'Helvetica-Bold',
    size: 7.5,
    align: 'center',
  });
  cell(doc, margin + subjectW, y + headerH, detailW, headerH, AMBER_LIGHT);
  text(doc, 'Term-1', margin + subjectW, y + headerH, detailW, headerH, {
    font: 'Helvetica-Bold',
    size: 7.5,
    align: 'center',
  });

  y += headerH * 2;

  data.co_scholastic.forEach((row) => {
    cell(doc, margin, y, subjectW, rowH, AMBER_LIGHT);
    text(doc, row.subject.toUpperCase(), margin, y, subjectW, rowH, {
      font: 'Helvetica-Bold',
      size: 8,
    });
    cell(doc, margin + subjectW, y, detailW, rowH);
    text(doc, row.term_detail || '-', margin + subjectW, y, detailW, rowH, {
      size: 8,
      align: 'center',
    });
    y += rowH;
  });

  return y + 6;
}

// ─── Footer summary + signatures ─────────────────────────────────────────────

function summaryAndSignatures(
  doc: PDFKit.PDFDocument,
  data: ReportCardPdfData,
  y: number,
  margin = 40,
): void {
  const pageW = doc.page.width;
  const tableW = pageW - margin * 2;
  const colW = tableW / 4;
  const rowH = 22;

  // Summary bar
  const summaryItems = [
    { label: 'Total Marks:', value: `${data.grand_total_scored} / ${data.grand_total_marks}` },
    { label: 'Per(%):', value: data.grand_percentage },
    { label: 'Grade:', value: data.grand_grade },
    { label: 'Rank:', value: String(data.rank) },
  ];
  summaryItems.forEach((item, i) => {
    cell(doc, margin + i * colW, y, colW, rowH, i % 2 === 0 ? AMBER_LIGHT : WHITE);
    text(doc, item.label, margin + i * colW + 4, y, colW * 0.45, rowH, {
      font: 'Helvetica-Bold',
      size: 8,
    });
    text(doc, item.value, margin + i * colW + colW * 0.45, y, colW * 0.5, rowH, {
      font: 'Helvetica-Bold',
      size: 10,
      color: DARK_GREY,
    });
  });

  y += rowH + 8;

  // Remarks
  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .fillColor(BLACK)
    .text('Remarks: ', margin, y, { continued: true });
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(MID_GREY)
    .text(data.remarks || '');
  y += 50;

  // Signatures
  const sigW = 110;
  const sigPositions = [
    { x: margin, label: 'Exam Controller' },
    { x: pageW / 2 - sigW / 2, label: 'Class Teacher' },
    { x: pageW - margin - sigW, label: 'Principal' },
  ];

  sigPositions.forEach(({ x, label }) => {
    doc
      .moveTo(x, y)
      .lineTo(x + sigW, y)
      .strokeColor(DARK_GREY)
      .lineWidth(0.5)
      .stroke();
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(BLACK)
      .text(label, x, y + 4, { width: sigW, align: 'center' });
  });

  // Date bottom-left
  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .fillColor(BLACK)
    .text(`Date : ${data.issue_date}`, margin, y + 4);
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateReportCardPdf(data: ReportCardPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size: 'A4', margin: 0 });

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const margin = 40;

    let y = schoolHeader(doc, data.school, margin);
    y = studentInfoTable(doc, data, y + 22, margin);
    y = scholasticTable(doc, data, y, margin);
    y = coScholasticTable(doc, data, y, margin);
    summaryAndSignatures(doc, data, y, margin);

    doc.end();
  });
}

// ─── Grade resolver ───────────────────────────────────────────────────────────

export function resolveGrade(
  percentage: number,
  grading: { grade_name: string; from_percentage: string; to_percentage: string }[],
): string {
  for (const g of grading) {
    const from = parseFloat(g.from_percentage);
    const to = parseFloat(g.to_percentage);
    if (percentage >= from && percentage <= to) return g.grade_name;
  }
  return 'F';
}

export function buildGradingScaleLabel(
  grading: {
    grade_name: string;
    from_percentage: string;
    to_percentage: string;
    sequence_index: number;
  }[],
): string {
  return grading
    .sort((a, b) => b.sequence_index - a.sequence_index)
    .map((g) => `${g.grade_name} (${g.from_percentage} - ${g.to_percentage})`)
    .join(', ');
}
