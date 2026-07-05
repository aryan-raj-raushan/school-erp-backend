import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { Response } from 'express';
import { ExamAttendanceCardService, AttendanceCardData } from './exam-attendance-card.service';
import { GetSchoolId } from '@common/decorators/school-id.decorator';
import { ApiResponse } from '@shared/responses/api-response';

/** Best-effort image fetch — a missing/broken/unsupported photo just falls back to a blank cell rather than failing the whole PDF. */
async function fetchImageBuffer(url: string | null | undefined): Promise<Buffer | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

class AttendanceCardQueryDto {
  @IsUUID() exam_id: string;
  @IsUUID() class_id: string;
  @IsUUID() academic_year_id: string;
  @IsOptional() @IsUUID() section_id?: string;
}

@ApiTags('Exam – Attendance Card (PDF)')
@ApiBearerAuth('access-token')
@Controller('exam/attendance-card')
export class ExamAttendanceCardController {
  constructor(private readonly service: ExamAttendanceCardService) {}

  @Get('data')
  @ApiOperation({ summary: 'Get attendance card raw data (JSON)' })
  @ApiQuery({ name: 'exam_id', required: true })
  @ApiQuery({ name: 'class_id', required: true })
  @ApiQuery({ name: 'academic_year_id', required: true })
  @ApiQuery({ name: 'section_id', required: false })
  async getCardData(@Query() query: AttendanceCardQueryDto, @GetSchoolId() schoolId: string) {
    const data = await this.service.getAttendanceCardData(
      query.exam_id,
      query.class_id,
      query.section_id,
      query.academic_year_id,
      schoolId,
    );
    return ApiResponse.success(data, 'Attendance card data fetched successfully');
  }

  @Get('pdf')
  @ApiOperation({
    summary: 'Download attendance card as PDF',
    description:
      'Returns a PDF with all students and exam subjects. Students sign against each subject column. ' +
      'PDF generation uses the data from /attendance-card/data endpoint.',
  })
  @ApiQuery({ name: 'exam_id', required: true })
  @ApiQuery({ name: 'class_id', required: true })
  @ApiQuery({ name: 'academic_year_id', required: true })
  @ApiQuery({ name: 'section_id', required: false })
  async downloadPdf(
    @Query() query: AttendanceCardQueryDto,
    @GetSchoolId() schoolId: string,
    @Res() res: Response,
  ) {
    const data = await this.service.getAttendanceCardData(
      query.exam_id,
      query.class_id,
      query.section_id,
      query.academic_year_id,
      schoolId,
    );

    // Fetch all images up front — pdfkit needs buffers, not URLs, and we'd
    // rather pay one round of concurrent fetches than block per-cell later.
    const [logoBuffer, photoBuffers] = await Promise.all([
      fetchImageBuffer(data.school.logoUrl),
      Promise.all(data.students.map((s) => fetchImageBuffer(s.photoUrl))),
    ]);

    // Build the whole PDF into a Buffer (rather than doc.pipe(res)) so the
    // response is written with a single synchronous res.end(buffer) call —
    // same as the working XLSX export elsewhere in this codebase. Streaming
    // via pipe() writes asynchronously across several event-loop ticks, so
    // the global MsgpackInterceptor's `response.headersSent` race can fire
    // before any bytes are flushed and stomp the stream with a msgpack body,
    // producing a PDF that downloads but won't open.
    const buffer = await buildAttendanceCardPdfBuffer(data, logoBuffer, photoBuffers);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="attendance-card-${query.exam_id}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}

function buildAttendanceCardPdfBuffer(
  data: AttendanceCardData,
  logoBuffer: Buffer | null,
  photoBuffers: (Buffer | null)[],
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ layout: 'landscape', margin: 30, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    renderAttendanceCard(doc, data, logoBuffer, photoBuffers);
    doc.end();
  });
}

/** Draws the school header, title, and the student × subject signature grid onto an open PDFKit document. */
function renderAttendanceCard(
  doc: any,
  data: AttendanceCardData,
  logoBuffer: Buffer | null,
  photoBuffers: (Buffer | null)[],
): void {
  const left = doc.page.margins.left;
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  // ── School header ────────────────────────────────────────────────────────
  const headerTop = doc.y;
  if (logoBuffer) {
    try {
      doc.image(logoBuffer, left, headerTop, { width: 55, height: 55 });
    } catch {
      // unsupported image format — skip the logo, keep going
    }
  }
  const headerTextX = logoBuffer ? left + 65 : left;
  const headerTextWidth = pageWidth - (logoBuffer ? 65 : 0);
  doc
    .fontSize(16)
    .font('Helvetica-Bold')
    .text(data.school.name, headerTextX, headerTop, { width: headerTextWidth, align: 'center' });
  doc.font('Helvetica').fontSize(9);
  if (data.school.address) {
    doc.text(data.school.address, headerTextX, doc.y, { width: headerTextWidth, align: 'center' });
  }
  if (data.school.phone) {
    doc.text(`Phone: ${data.school.phone}`, headerTextX, doc.y, {
      width: headerTextWidth,
      align: 'center',
    });
  }
  doc.moveDown(0.5);

  // ── Title ────────────────────────────────────────────────────────────────
  doc.fontSize(14).font('Helvetica-Bold').text('EXAM ATTENDANCE CARD', { align: 'center' });
  const sessionLine = [data.examName, data.className, data.academicYear]
    .filter(Boolean)
    .join(' / ');
  doc
    .fontSize(10)
    .font('Helvetica')
    .text(
      data.sectionName ? `${sessionLine} (Section ${data.sectionName})` : sessionLine,
      { align: 'center' },
    );
  doc.moveDown(0.75);

  // ── Table ────────────────────────────────────────────────────────────────
  const classColWidth = 55;
  const photoColWidth = 45;
  const nameColWidth = 150;
  const fixedWidth = classColWidth + photoColWidth + nameColWidth;
  const subjectColWidth = Math.max(65, (pageWidth - fixedWidth) / Math.max(data.schedules.length, 1));

  const headerRowHeight = 34;
  const rowHeight = 50;
  let x = left;
  let y = doc.y;

  const drawCell = (cx: number, cy: number, w: number, h: number) => doc.rect(cx, cy, w, h).stroke();

  const drawTableHeader = (headerY: number): number => {
    let hx = left;
    doc.fontSize(8).font('Helvetica-Bold');
    drawCell(hx, headerY, classColWidth, headerRowHeight);
    doc.text('Class', hx + 2, headerY + 4, { width: classColWidth - 4 });
    hx += classColWidth;
    drawCell(hx, headerY, photoColWidth, headerRowHeight);
    hx += photoColWidth;
    drawCell(hx, headerY, nameColWidth, headerRowHeight);
    doc.text('Name', hx + 2, headerY + 4, { width: nameColWidth - 4 });
    hx += nameColWidth;
    for (const s of data.schedules) {
      drawCell(hx, headerY, subjectColWidth, headerRowHeight);
      doc.text(`${s.subjectName}\n${s.examDate}`, hx + 2, headerY + 3, {
        width: subjectColWidth - 4,
      });
      hx += subjectColWidth;
    }
    doc.font('Helvetica').fontSize(8);
    return headerY + headerRowHeight;
  };

  y = drawTableHeader(y);

  // Data rows
  data.students.forEach((student, idx) => {
    if (y > doc.page.height - doc.page.margins.bottom - rowHeight) {
      doc.addPage();
      y = drawTableHeader(doc.page.margins.top);
    }

    x = left;
    drawCell(x, y, classColWidth, rowHeight);
    doc.text(data.className, x + 2, y + rowHeight / 2 - 4, { width: classColWidth - 4 });
    x += classColWidth;

    drawCell(x, y, photoColWidth, rowHeight);
    const photo = photoBuffers[idx];
    if (photo) {
      try {
        doc.image(photo, x + (photoColWidth - 34) / 2, y + (rowHeight - 34) / 2, {
          width: 34,
          height: 34,
        });
      } catch {
        // unsupported/corrupt image — leave the cell blank
      }
    }
    x += photoColWidth;

    drawCell(x, y, nameColWidth, rowHeight);
    const nameLines = [
      student.studentName,
      student.parentName ? `(${student.parentName})` : null,
      `Roll No: ${student.rollNumber}`,
    ].filter(Boolean) as string[];
    doc.text(nameLines.join('\n'), x + 3, y + 4, { width: nameColWidth - 6 });
    x += nameColWidth;

    for (let i = 0; i < data.schedules.length; i++) {
      drawCell(x, y, subjectColWidth, rowHeight); // blank — student signs here on exam day
      x += subjectColWidth;
    }

    y += rowHeight;
  });
}
