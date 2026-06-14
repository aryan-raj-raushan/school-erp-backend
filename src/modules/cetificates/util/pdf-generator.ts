import PDFDocument from 'pdfkit';

export interface SchoolInfo {
  name: string;
  tagline?: string;
  address?: string;
  contact_number?: string;
  logo_url?: string;
}

export interface StudentInfo {
  first_name: string;
  last_name?: string;
  date_of_birth?: string;
  aadhaar_number?: string;
  profile_image?: string;
  // Academic
  roll_number?: string;
  admission_number?: string;
  enrollment_number?: string;
  pen_number?: string;
  // Address
  permanent_address?: string;
  temporary_address?: string;
  // Parent
  father_name?: string;
  mother_name?: string;
  guardian_relation?: string;
}
export interface TransferCertData {
  school: SchoolInfo;
  student: StudentInfo;
  cert: {
    reference_no: string;
    class_with_session: string; // e.g. "2ND (2026-2027)"
    qualified_for_higher_class: string;
    date_of_admission: string;
    leaving_date: string;
    total_working_days: number;
    total_present: number;
    extra_activities?: string;
    candidate_character: string;
    leaving_reason: string;
    fees_due: string;
    issue_date: string;
  };
}

export interface BonafideCertData {
  school: SchoolInfo;
  student: StudentInfo;
  cert: {
    reference_no: string;
    class_name: string;
    academic_year: string;
    purpose: string;
    issue_date: string;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function drawHorizontalRule(doc: PDFKit.PDFDocument, y: number, margin = 50) {
  doc
    .moveTo(margin, y)
    .lineTo(doc.page.width - margin, y)
    .strokeColor('#333333')
    .lineWidth(1)
    .stroke();
}

function schoolHeader(doc: PDFKit.PDFDocument, school: SchoolInfo, margin = 50): number {
  const startY = 40;
  const centerX = doc.page.width / 2;

  // Logo placeholder (left)
  doc.rect(margin, startY, 70, 70).strokeColor('#cccccc').lineWidth(1).stroke();
  doc
    .fontSize(7)
    .fillColor('#aaaaaa')
    .text('SCHOOL\nLOGO', margin + 8, startY + 25, { width: 54, align: 'center' });

  // School info (center)
  if (school.tagline) {
    doc
      .fontSize(8)
      .fillColor('#555555')
      .font('Helvetica-Oblique')
      .text(`"${school.tagline}"`, centerX - 150, startY + 2, { width: 300, align: 'center' });
  }

  doc
    .fontSize(18)
    .fillColor('#000000')
    .font('Helvetica-Bold')
    .text(school.name.toUpperCase(), centerX - 150, startY + 16, {
      width: 300,
      align: 'center',
    });

  if (school.address) {
    doc
      .fontSize(8)
      .fillColor('#444444')
      .font('Helvetica')
      .text(school.address, centerX - 150, startY + 38, { width: 300, align: 'center' });
  }

  // Phone (right)
  if (school.contact_number) {
    doc
      .fontSize(10)
      .fillColor('#000000')
      .font('Helvetica')
      .text(`☎  ${school.contact_number}`, doc.page.width - margin - 120, startY + 20, {
        width: 120,
        align: 'right',
      });
  }

  return startY + 80;
}

// ─── Transfer Certificate PDF ─────────────────────────────────────────────────

export async function generateTransferCertificatePdf(data: TransferCertData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const margin = 50;
    const pageWidth = doc.page.width - margin * 2;

    // ── Header ──
    let y = schoolHeader(doc, data.school, margin);
    y += 5;
    drawHorizontalRule(doc, y, margin);
    y += 10;

    // ── Title ──
    doc
      .fontSize(13)
      .font('Helvetica-Bold')
      .fillColor('#000000')
      .text('SCHOOL LEAVING CERTIFICATE', margin, y, { width: pageWidth, align: 'center' });
    y += 22;
    drawHorizontalRule(doc, y, margin);
    y += 14;

    // ── Reference + Date ──
    const { cert, student } = data;
    doc
      .fontSize(10)
      .font('Helvetica-Oblique')
      .fillColor('#000000')
      .text(`Reference No: `, margin, y, { continued: true })
      .font('Helvetica-BoldOblique')
      .text(cert.reference_no);

    doc
      .font('Helvetica-Oblique')
      .fillColor('#000000')
      .text(`Date: ......................`, margin + pageWidth - 160, y);

    y += 22;

    // ── Student Photo Box ──
    const photoBoxX = doc.page.width - margin - 90;
    const photoBoxY = y;
    doc.rect(photoBoxX, photoBoxY, 88, 100).strokeColor('#888888').lineWidth(1).stroke();
    doc
      .fontSize(7)
      .fillColor('#aaaaaa')
      .font('Helvetica')
      .text('Student\nPhoto', photoBoxX + 24, photoBoxY + 40, { width: 40, align: 'center' });

    // ── Info Rows ──
    const rowHeight = 22;
    const rightLimit = photoBoxX - 10;
    const rows: [string, string][] = [
      ['1. Name of Candidate', (student.first_name + ' ' + (student.last_name ?? '')).trim()],
      ['2. Name of Guardian/Father', student.father_name ?? '-'],
      ['3. Name of Mother', student.mother_name ?? '-'],
      ['4. Relation of Candidate with Guardian', student.guardian_relation ?? 'PARENT'],
    ];

    rows.forEach(([label, value]) => {
      doc
        .rect(margin, y, rightLimit - margin, rowHeight)
        .strokeColor('#cccccc')
        .lineWidth(0.5)
        .stroke();
      doc
        .fontSize(9.5)
        .font('Helvetica-Oblique')
        .fillColor('#000000')
        .text(`${label} `, margin + 6, y + 6, { continued: true })
        .font('Helvetica-BoldOblique')
        .text(value);
      y += rowHeight;
    });

    y = Math.max(y, photoBoxY + 102);

    const fullRows: [string, string][] = [
      ['5. Permanent Address', student.permanent_address ?? '-'],
      ['6. Temporary Address', student.temporary_address ?? '-'],
      ['7. Enrolment Number', student.enrollment_number ?? '-'],
      ['8. P.E.N Number', student.pen_number ?? '-'],
      ['9. AAPAR Number', student.aadhaar_number ?? '-'],
      ['10. Date of Birth', student.date_of_birth ?? '-'],
      ['11. Class with Session', cert.class_with_session],
      [
        '12. Whether candidate qualified for promotion to the higher class',
        cert.qualified_for_higher_class,
      ],
      [
        '13. Attendance of Student after school leaving before end of the session in present year',
        '',
      ],
    ];

    fullRows.forEach(([label, value]) => {
      const rh = label.length > 70 ? 24 : rowHeight;
      doc.rect(margin, y, pageWidth, rh).strokeColor('#cccccc').lineWidth(0.5).stroke();
      doc
        .fontSize(9.5)
        .font('Helvetica-Oblique')
        .fillColor('#000000')
        .text(`${label} `, margin + 6, y + (rh - 12) / 2, { continued: !!value, lineBreak: false })
        .font('Helvetica-BoldOblique')
        .text(value, { lineBreak: false });
      y += rh;
    });

    // ── Attendance Table ──
    const cols = ['Date of Admission', 'Date of Leaving', 'Total Working Days', 'Total Present'];
    const vals = [
      cert.date_of_admission,
      cert.leaving_date,
      String(cert.total_working_days),
      String(cert.total_present),
    ];
    const colW = pageWidth / 4;

    // Header row
    cols.forEach((col, i) => {
      doc
        .rect(margin + i * colW, y, colW, 22)
        .strokeColor('#555555')
        .lineWidth(0.5)
        .stroke();
      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#000000')
        .text(col, margin + i * colW + 4, y + 6, { width: colW - 8, align: 'center' });
    });
    y += 22;

    // Data row
    vals.forEach((val, i) => {
      doc
        .rect(margin + i * colW, y, colW, 22)
        .strokeColor('#555555')
        .lineWidth(0.5)
        .stroke();
      doc
        .fontSize(9.5)
        .font('Helvetica-Oblique')
        .fillColor('#000000')
        .text(val, margin + i * colW + 4, y + 6, { width: colW - 8, align: 'center' });
    });
    y += 24;

    // ── Remaining rows ──
    const lastRows: [string, string][] = [
      ['14. Extra Activities (If Any)', cert.extra_activities ?? ''],
      ['15. Character (During Study Period)', cert.candidate_character],
      ['16. Reason for leaving the school', cert.leaving_reason],
      ['17. Due Amount (If any remained)', cert.fees_due],
    ];

    lastRows.forEach(([label, value]) => {
      doc.rect(margin, y, pageWidth, rowHeight).strokeColor('#cccccc').lineWidth(0.5).stroke();
      doc
        .fontSize(9.5)
        .font('Helvetica-Oblique')
        .fillColor('#000000')
        .text(`${label} `, margin + 6, y + 6, { continued: !!value, lineBreak: false })
        .font('Helvetica-BoldOblique')
        .text(value, { lineBreak: false });
      y += rowHeight;
    });

    y += 40;

    // ── Signatures ──
    const sigPositions = [margin, doc.page.width / 2 - 50, doc.page.width - margin - 120];
    const sigLabels = ['Clerk', 'Date of Issue', 'Principal Signature'];
    sigPositions.forEach((x, i) => {
      doc
        .moveTo(x, y)
        .lineTo(x + 110, y)
        .strokeColor('#333333')
        .lineWidth(0.5)
        .stroke();
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#000000')
        .text(sigLabels[i], x, y + 6, { width: 110, align: 'center' });
    });

    doc.end();
  });
}

// ─── Bonafide Certificate PDF ─────────────────────────────────────────────────

export async function generateBonafideCertificatePdf(data: BonafideCertData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size: 'A4', margin: 60 });

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const margin = 60;
    const pageWidth = doc.page.width - margin * 2;
    const { cert, student, school } = data;

    // ── Header ──
    let y = schoolHeader(doc, school, margin);
    y += 8;
    drawHorizontalRule(doc, y, margin);
    y += 8;
    drawHorizontalRule(doc, y + 2, margin);
    y += 20;

    // ── Reference No ──
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#000000')
      .text(`Reference No: ${cert.reference_no}`, margin, y);
    y += 30;

    // ── Title ──
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#000000')
      .text('BONAFIDE CERTIFICATE', margin, y, {
        width: pageWidth,
        align: 'center',
        underline: true,
      });
    y += 40;

    // ── Body ──
    const fullName = `${student.first_name} ${student.last_name ?? ''}`.trim();
    const fatherName = student.father_name ?? 'N/A';
    const admNo = student.admission_number ?? 'N/A';

    // Line 1
    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#000000')
      .text('This is to certify that ', margin, y, { continued: true })
      .font('Helvetica-Bold')
      .text(fullName, { continued: true })
      .font('Helvetica')
      .text(', son/daughter of ', { continued: true })
      .font('Helvetica-Bold')
      .text(fatherName, { continued: true })
      .font('Helvetica')
      .text(', bearing Roll No. ', { continued: true })
      .font('Helvetica-Bold')
      .text(admNo, { continued: true })
      .font('Helvetica')
      .text(', is a bonafide student of');
    y = doc.y + 6;

    // Line 2
    doc
      .font('Helvetica-Bold')
      .text(school.name.toUpperCase(), margin, y, { continued: true })
      .font('Helvetica')
      .text(' studying in ', { continued: true })
      .font('Helvetica-Bold')
      .text(cert.class_name, { continued: true })
      .font('Helvetica')
      .text(' for the academic year ', { continued: true })
      .font('Helvetica-Bold')
      .text(`${cert.academic_year}.`, { continued: false });
    y = doc.y + 30;

    // ── Details ──
    const details: [string, string][] = [
      ['Date of Birth', student.date_of_birth ?? '-'],
      ['Admission No.', student.admission_number ?? '-'],
      ['Purpose of Issue', cert.purpose],
    ];

    details.forEach(([label, value]) => {
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor('#000000')
        .text(`${label}: `, margin, y, { continued: true })
        .font('Helvetica')
        .text(value);
      y = doc.y + 8;
    });

    y += 60;

    // ── Signatures ──
    const sigPositions = [margin, doc.page.width / 2 - 50, doc.page.width - margin - 130];
    const sigTopLabels = ['', cert.issue_date, ''];
    const sigBottomLabels = ['Clerk Signature', 'Date of Issue', 'Principal Signature'];

    sigPositions.forEach((x, i) => {
      if (sigTopLabels[i]) {
        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#000000')
          .text(sigTopLabels[i], x, y, { width: 120, align: 'center' });
      }
      doc
        .moveTo(x, y + 18)
        .lineTo(x + 120, y + 18)
        .strokeColor('#333333')
        .lineWidth(0.5)
        .stroke();
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#000000')
        .text(sigBottomLabels[i], x, y + 24, { width: 120, align: 'center' });
    });

    doc.end();
  });
}
