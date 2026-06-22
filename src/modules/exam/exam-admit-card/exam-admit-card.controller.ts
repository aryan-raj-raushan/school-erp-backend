import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { Response } from 'express';
import { ExamAdmitCardService } from './exam-admit-card.service';
import { GetSchoolId } from '@common/decorators/school-id.decorator';
import { ApiResponse } from '@shared/responses/api-response';

class AdmitCardQueryDto {
  @IsUUID() student_id: string;
  @IsUUID() exam_id: string;
  @IsUUID() academic_year_id: string;
}

@ApiTags('Exam – Admit Card (PDF)')
@ApiBearerAuth('access-token')
@Controller('exam/admit-card')
export class ExamAdmitCardController {
  constructor(private readonly service: ExamAdmitCardService) {}

  @Get('data')
  @ApiOperation({ summary: 'Get admit card raw data for a student (JSON)' })
  @ApiQuery({ name: 'student_id', required: true })
  @ApiQuery({ name: 'exam_id', required: true })
  @ApiQuery({ name: 'academic_year_id', required: true })
  async getCardData(@Query() query: AdmitCardQueryDto, @GetSchoolId() schoolId: string) {
    const data = await this.service.getAdmitCardData(
      query.student_id,
      query.exam_id,
      query.academic_year_id,
      schoolId,
    );
    return ApiResponse.success(data, 'Admit card data fetched successfully');
  }

  @Get('pdf')
  @ApiOperation({
    summary: 'Download student admit card as PDF',
    description:
      'Returns a PDF admit card for the student showing their details, class, section, school, ' +
      'exam name, and a full timetable of exam subjects with dates and timings.',
  })
  @ApiQuery({ name: 'student_id', required: true })
  @ApiQuery({ name: 'exam_id', required: true })
  @ApiQuery({ name: 'academic_year_id', required: true })
  async downloadPdf(
    @Query() query: AdmitCardQueryDto,
    @GetSchoolId() schoolId: string,
    @Res() res: Response,
  ) {
    const data = await this.service.getAdmitCardData(
      query.student_id,
      query.exam_id,
      query.academic_year_id,
      schoolId,
    );

    // ── PDF generation (PDFKit) ─────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 40 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="admit-card-${data.student.admissionNumber}.pdf"`,
    );
    doc.pipe(res);

    // ── Header ────────────────────────────────────────────────────────────
    doc.fontSize(18).text(data.school.name, { align: 'center' });
    doc.fontSize(13).text('ADMIT CARD', { align: 'center' });
    doc.moveDown(0.5);
    doc
      .fontSize(12)
      .text(`Exam: ${data.exam.name}  |  Term: ${data.exam.term}`, { align: 'center' });
    doc.text(`${data.exam.startDate}  –  ${data.exam.endDate}`, { align: 'center' });
    doc.moveDown();

    // ── Student Details ───────────────────────────────────────────────────
    doc.fontSize(11);
    const details = [
      ['Student Name', data.student.name],
      ['Admission No.', data.student.admissionNumber],
      ['Roll Number', data.student.rollNumber ?? '-'],
      ['Class', data.student.className],
      ['Section', data.student.sectionName ?? '-'],
    ];
    details.forEach(([label, value]) => {
      doc.text(`${label}: `, { continued: true }).text(value, { underline: false });
    });
    doc.moveDown();

    // ── Timetable ─────────────────────────────────────────────────────────
    doc.fontSize(12).text('Exam Timetable', { underline: true });
    doc.moveDown(0.5);

    const colWidths = [160, 80, 70, 70, 70, 70];
    const headers = ['Subject', 'Type', 'Date', 'Start', 'End', 'Max Marks'];
    let x = doc.page.margins.left;
    const rowH = 22;
    let y = doc.y;

    // Header row
    headers.forEach((h, i) => {
      doc.rect(x, y, colWidths[i], rowH).fillAndStroke('#e8e8e8', '#000');
      doc
        .fillColor('#000')
        .fontSize(9)
        .text(h, x + 2, y + 5, { width: colWidths[i] - 4 });
      x += colWidths[i];
    });
    y += rowH;

    // Data rows
    data.schedules.forEach((s) => {
      x = doc.page.margins.left;
      const cells = [
        s.subjectName,
        s.subjectType,
        s.examDate,
        s.startTime,
        s.endTime,
        String(s.examMarks),
      ];
      cells.forEach((cell, i) => {
        doc.rect(x, y, colWidths[i], rowH).stroke();
        doc.fontSize(9).text(cell, x + 2, y + 5, { width: colWidths[i] - 4 });
        x += colWidths[i];
      });
      y += rowH;
    });

    doc.moveDown(3);

    // ── Signature ─────────────────────────────────────────────────────────
    doc.fontSize(10);
    doc.text("Principal's Signature: ________________", { align: 'left' });
    doc.text("Student's Signature:  ________________", { align: 'right' });

    doc.end();
  }
}
