import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { ExamSittingService } from './exam-sitting.service';
import {
  CreateSittingPlanBulkDto,
  UpdateSittingPlanDto,
  FilterSittingPlanDto,
  AutoShuffleSittingPlanDto,
} from './dto/exam-sitting.dto';
import { GetSchoolId } from '@common/decorators/school-id.decorator';
import { ApiResponse } from '@shared/responses/api-response';
import { GetCurrentUserId } from '@common/decorators/current-user.decorator';

@ApiTags('Exam – Sitting Plan')
@ApiBearerAuth('access-token')
@Controller('exam/sitting-plans')
export class ExamSittingController {
  constructor(private readonly service: ExamSittingService) {}

  @Get()
  @ApiOperation({ summary: 'List sitting plan entries with filters' })
  async findAll(@GetSchoolId() schoolId: string, @Query() filters: FilterSittingPlanDto) {
    const data = await this.service.findAll(schoolId, filters);
    return ApiResponse.success(data.items, 'Sitting plans fetched successfully', data.meta);
  }

  @Get('room-pdf')
  @ApiOperation({ summary: 'Download room seating chart as PDF' })
  @ApiQuery({ name: 'exam_ids', isArray: true, required: true })
  @ApiQuery({ name: 'hall_detail_id', required: true })
  @ApiQuery({ name: 'academic_year_id', required: true })
  async roomPdf(
    @Query('exam_ids') rawExamIds: string | string[],
    @Query('hall_detail_id') hallDetailId: string,
    @Query('academic_year_id') academicYearId: string,
    @GetSchoolId() schoolId: string,
    @Res() res: Response,
  ) {
    const exam_ids = Array.isArray(rawExamIds) ? rawExamIds : [rawExamIds];
    const data = await this.service.getRoomPdfData({ exam_ids, hall_detail_id: hallDetailId, academic_year_id: academicYearId }, schoolId);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const PDFDocument = require('pdfkit');

    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageW = doc.page.width - doc.page.margins.left - doc.page.margins.right;

      // ── Header ──────────────────────────────────────────────────────────────
      doc.fontSize(16).font('Helvetica-Bold').text(data.school_name, { align: 'center' });
      doc.fontSize(12).text('SEATING CHART', { align: 'center' });
      doc.font('Helvetica').fontSize(10);
      doc.moveDown(0.3);
      doc.text(`Room: ${data.room_name}  |  Capacity: ${data.sitting_capacity}  |  Exam: ${data.exam_names.join(' / ')}`, { align: 'center' });
      doc.moveDown(0.8);

      // ── Compute grid layout ─────────────────────────────────────────────────
      const capacity = data.sitting_capacity;
      const gridCols = data.grid_cols ?? Math.ceil(Math.sqrt(capacity));
      const gridRows = data.grid_rows ?? Math.ceil(capacity / gridCols);

      // Build seat map: seat_number → student info
      const seatMap = new Map<number, { name: string; class_name: string; section: string; roll: string }>();
      data.students.forEach((s, idx) => {
        const seat = s.seat_number ?? idx + 1;
        seatMap.set(seat, {
          name: s.student_name,
          class_name: s.class_name,
          section: s.section_name ?? '',
          roll: s.roll_number ?? '',
        });
      });

      // ── Draw grid ────────────────────────────────────────────────────────────
      const cellW = Math.floor(pageW / gridCols);
      const cellH = 52;
      const startX = doc.page.margins.left;
      let startY = doc.y;

      // "Front of Class" label
      doc.fontSize(8).fillColor('#888').text('▲  FRONT OF CLASS  ▲', { align: 'center' });
      doc.moveDown(0.3);
      startY = doc.y;

      doc.font('Helvetica').fillColor('#000');

      for (let row = 0; row < gridRows; row++) {
        // Check if we need a new page
        if (startY + cellH > doc.page.height - doc.page.margins.bottom) {
          doc.addPage();
          startY = doc.page.margins.top;
        }

        for (let col = 0; col < gridCols; col++) {
          const seatNum = row * gridCols + col + 1;
          if (seatNum > capacity) break;

          const cx = startX + col * cellW;
          const cy = startY;
          const student = seatMap.get(seatNum);

          // Cell background
          const bg = student ? '#e8f5e9' : '#f9f9f9';
          const border = student ? '#4caf50' : '#cccccc';
          doc.rect(cx + 1, cy + 1, cellW - 2, cellH - 2).fillAndStroke(bg, border);

          // Seat number (top-left)
          doc.fontSize(7).fillColor('#888').font('Helvetica')
            .text(`#${seatNum}`, cx + 4, cy + 4, { width: cellW - 8, lineBreak: false });

          if (student) {
            // Student name (centred)
            const nameParts = student.name.split(' ');
            const displayName = nameParts.length > 1
              ? `${nameParts[0]} ${nameParts[nameParts.length - 1][0]}.`
              : student.name;
            doc.fontSize(8).fillColor('#1a1a1a').font('Helvetica-Bold')
              .text(displayName, cx + 3, cy + 16, { width: cellW - 6, lineBreak: false });
            const classSec = student.section ? `${student.class_name} - ${student.section}` : student.class_name;
            doc.fontSize(7).fillColor('#555').font('Helvetica')
              .text(classSec, cx + 3, cy + 28, { width: cellW - 6, lineBreak: false });
            if (student.roll) {
              doc.fontSize(6).fillColor('#777')
                .text(`Roll: ${student.roll}`, cx + 3, cy + 39, { width: cellW - 6, lineBreak: false });
            }
          } else {
            doc.fontSize(7).fillColor('#bbb').font('Helvetica')
              .text('Empty', cx + 3, cy + 22, { width: cellW - 6, align: 'center', lineBreak: false });
          }
        }
        startY += cellH;
      }

      // ── List table below grid ────────────────────────────────────────────────
      if (startY + 60 > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        startY = doc.page.margins.top;
      } else {
        startY += 16;
      }

      doc.moveTo(doc.page.margins.left, startY).lineTo(doc.page.margins.left + pageW, startY).stroke('#ccc');
      startY += 10;
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#000').text('Student List', doc.page.margins.left, startY);
      startY += 14;

      const colWidths = [40, 200, 90, 70, 70];
      const headers = ['Seat', 'Student Name', 'Class', 'Section', 'Roll No.'];
      const rowH = 18;
      let tx = doc.page.margins.left;
      let ty = startY;

      headers.forEach((h, i) => {
        doc.rect(tx, ty, colWidths[i], rowH).fillAndStroke('#e0e0e0', '#333');
        doc.fillColor('#000').fontSize(8).font('Helvetica-Bold')
          .text(h, tx + 3, ty + 4, { width: colWidths[i] - 6, lineBreak: false });
        tx += colWidths[i];
      });
      ty += rowH;

      doc.font('Helvetica').fontSize(8);
      const sorted = [...data.students].sort((a, b) => (a.seat_number ?? 0) - (b.seat_number ?? 0));
      sorted.forEach((s, idx) => {
        if (ty + rowH > doc.page.height - doc.page.margins.bottom) {
          doc.addPage();
          ty = doc.page.margins.top;
        }
        tx = doc.page.margins.left;
        const cells = [
          String(s.seat_number ?? idx + 1),
          s.student_name,
          s.class_name,
          s.section_name ?? '-',
          s.roll_number ?? '-',
        ];
        const fill = idx % 2 === 0 ? '#fff' : '#f7f7f7';
        cells.forEach((cell, i) => {
          doc.rect(tx, ty, colWidths[i], rowH).fillAndStroke(fill, '#ccc');
          doc.fillColor('#000').text(cell, tx + 3, ty + 4, { width: colWidths[i] - 6, lineBreak: false });
          tx += colWidths[i];
        });
        ty += rowH;
      });

      // ── Footer ──────────────────────────────────────────────────────────────
      ty += 8;
      doc.fontSize(9).font('Helvetica').fillColor('#333').text(
        `Total assigned: ${data.students.length} / ${data.sitting_capacity}  |  Grid: ${gridCols} cols × ${gridRows} rows`,
        { align: 'right' },
      );

      doc.end();
    });

    const safeRoomName = data.room_name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="seating-${safeRoomName}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single sitting plan entry' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    const data = await this.service.findById(id, schoolId);
    return ApiResponse.success(data, 'Sitting plan fetched successfully');
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Bulk assign students to rooms (validates capacity)',
  })
  async bulkCreate(
    @Body() dto: CreateSittingPlanBulkDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.service.bulkCreate(dto, schoolId, userId);
    return ApiResponse.created(data, 'Sitting plans created successfully');
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a sitting plan entry' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateSittingPlanDto,
  ) {
    const data = await this.service.update(id, schoolId, dto);
    return ApiResponse.success(data, 'Sitting plan updated successfully');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a sitting plan entry' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    await this.service.remove(id, schoolId);
    return ApiResponse.noContent('Sitting plan deleted successfully');
  }

  @Post('auto-shuffle')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Auto-assign students across rooms with shuffle (mix classes/sections)',
    description:
      'Takes students from multiple exams (one per class), interleaves by class+section to prevent cheating, ' +
      'then fills specified rooms in order. Clears existing plans first if clear_existing=true.',
  })
  async autoShuffle(
    @Body() dto: AutoShuffleSittingPlanDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.service.autoShuffle(dto, schoolId, userId);
    return ApiResponse.created(data, `${data.total_assigned} students assigned successfully`);
  }

}
