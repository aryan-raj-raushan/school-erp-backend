import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { Response } from 'express';
import { ExamAttendanceCardService } from './exam-attendance-card.service';
import { GetSchoolId } from '@common/decorators/school-id.decorator';
import { ApiResponse } from '@shared/responses/api-response';

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

    // ── PDF generation ──────────────────────────────────────────────────────
    // Uses PDFKit (npm install pdfkit @types/pdfkit).
    // Replace this block with your project's preferred PDF library.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ layout: 'landscape', margin: 30 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="attendance-card-${query.exam_id}.pdf"`,
    );
    doc.pipe(res);

    // Title
    doc.fontSize(16).text(`Exam Attendance Card – ${data.examName}`, { align: 'center' });
    doc
      .fontSize(11)
      .text(
        `Class: ${data.className}${data.sectionName ? ' | Section: ' + data.sectionName : ''}`,
        { align: 'center' },
      );
    doc.moveDown();

    // Table header: Roll No | Name | Admission No | Subject1 | Subject2 | …
    const colWidth = 90;
    const fixedCols = ['Roll No', 'Student Name', 'Adm. No'];
    const subjectCols = data.schedules.map(
      (s) => `${s.subjectName}\n${s.examDate}\n${s.startTime}`,
    );
    const headers = [...fixedCols, ...subjectCols];

    let x = doc.page.margins.left;
    const rowHeight = 30;
    let y = doc.y;

    // Header row
    headers.forEach((h) => {
      doc.rect(x, y, colWidth, rowHeight).stroke();
      doc.fontSize(8).text(h, x + 2, y + 4, { width: colWidth - 4 });
      x += colWidth;
    });
    y += rowHeight;

    // Data rows
    data.students.forEach((student) => {
      x = doc.page.margins.left;
      const cells = [
        student.rollNumber,
        student.studentName,
        student.admissionNumber,
        ...student.signatures,
      ];
      cells.forEach((cell) => {
        doc.rect(x, y, colWidth, rowHeight).stroke();
        doc.fontSize(8).text(cell, x + 2, y + 8, { width: colWidth - 4 });
        x += colWidth;
      });
      y += rowHeight;

      // New page if needed
      if (y > doc.page.height - doc.page.margins.bottom - rowHeight) {
        doc.addPage();
        y = doc.page.margins.top;
      }
    });

    doc.end();
  }
}
