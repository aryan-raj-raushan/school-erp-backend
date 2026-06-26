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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ExamResultsService } from './exam-results.service';
import {
  BulkUpsertExamResultsDto,
  PublishExamResultDto,
  FilterExamResultDto,
  GenerateReportCardDto,
  PublishReportCardDto,
  FilterReportCardDto,
} from './dto/exam-result.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { PERMISSION_REGISTRY } from '../../shared/constants/permissions.registry';

// ─────────────────────────────────────────────────────────────────────────────
// EXAM RESULTS
// ─────────────────────────────────────────────────────────────────────────────

@ApiTags('Exam Results')
@ApiBearerAuth('access-token')
@Controller('exam-results')
export class ExamResultsController {
  constructor(private readonly service: ExamResultsService) {}

  /**
   * Bulk upsert marks for multiple students × subjects in a single request.
   * If a result row already exists (student + schedule), it is updated.
   */
  @Post('bulk')
  @Permissions(PERMISSION_REGISTRY.exams.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Bulk upsert exam results — add/update marks for multiple students at once',
    description:
      'Send an array of {student_id, exam_schedule_id, subject_id, marks_obtained, is_absent}. ' +
      'Existing rows are updated via ON CONFLICT; new rows are inserted.',
  })
  async bulkUpsert(
    @Body() dto: BulkUpsertExamResultsDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.service.bulkUpsertResults(dto, schoolId, userId);
    return ApiResponse.created(data, 'Exam results saved successfully');
  }

  /**
   * List results with optional filters — exam / class / section / student / search.
   * Returns a flat list of student × subject rows (useful for mark-entry screens).
   */
  @Get()
  @ApiOperation({ summary: 'List exam results with optional filters' })
  async findAll(@GetSchoolId() schoolId: string, @Query() filters: FilterExamResultDto) {
    const data = await this.service.findResults(schoolId, filters);
    return ApiResponse.success(data, 'Exam results fetched successfully');
  }

  /**
   * Publish or unpublish results for a given exam (optionally scoped to class/section).
   * When published, students/parents can view their marks.
   */
  @Patch('publish')
  @Permissions(PERMISSION_REGISTRY.exams.update)
  @ApiOperation({
    summary: 'Publish / unpublish exam results',
    description:
      'Set is_published=true to make results visible to students. Pass class_id / section_id to scope.',
  })
  async publish(@Body() dto: PublishExamResultDto, @GetSchoolId() schoolId: string) {
    const data = await this.service.publishResults(dto, schoolId);
    return ApiResponse.success(data, data.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORT CARDS
// ─────────────────────────────────────────────────────────────────────────────

@ApiTags('Report Cards')
@ApiBearerAuth('access-token')
@Controller('report-cards')
export class ReportCardsController {
  constructor(private readonly service: ExamResultsService) {}

  /**
   * Generate report card PDFs — for a single student or entire class section.
   * PDFs are stored on S3; URLs are returned in the response and persisted in DB.
   */
  @Post('generate')
  @Permissions(PERMISSION_REGISTRY.exams.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Generate report card PDF(s)',
    description:
      'Pass student_id for a single card, or omit it to generate for the whole class/section. ' +
      'PDFs are stored in S3 and the URLs saved to the DB.',
  })
  async generate(
    @Body() dto: GenerateReportCardDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.service.generateReportCards(dto, schoolId, userId);
    return ApiResponse.created(data, 'Report card(s) generated successfully');
  }

  /**
   * List all report cards with filters — paginated.
   */
  @Get()
  @ApiOperation({ summary: 'List report cards with filters (paginated)' })
  async findAll(@GetSchoolId() schoolId: string, @Query() filters: FilterReportCardDto) {
    const data = await this.service.findReportCards(schoolId, filters);
    return ApiResponse.success(data.items, 'Report cards fetched successfully', data.meta);
  }

  /**
   * Get single report card detail — includes PDF URL.
   */
  @Get(':id')
  @ApiParam({ name: 'id', description: 'Report Card UUID' })
  @ApiOperation({ summary: 'Get report card by ID — includes pdf_url for inline viewer' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    const data = await this.service.findReportCardById(id, schoolId);
    return ApiResponse.success(data, 'Report card fetched successfully');
  }

  /**
   * Publish or unpublish report cards — scoped by exam / class / section / student.
   */
  @Patch('publish')
  @Permissions(PERMISSION_REGISTRY.exams.update)
  @ApiOperation({
    summary: 'Publish / unpublish report cards',
    description:
      'Set is_published=true so students can view their report card. Scope with class_id / section_id / student_id.',
  })
  async publish(@Body() dto: PublishReportCardDto, @GetSchoolId() schoolId: string) {
    const data = await this.service.publishReportCards(dto, schoolId);
    return ApiResponse.success(data, data.message);
  }

  /**
   * Soft-delete a single report card (admin only — e.g. to force regeneration).
   */
  @Delete(':id')
  @Permissions(PERMISSION_REGISTRY.exams.delete)
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'Report Card UUID' })
  @ApiOperation({ summary: 'Soft-delete a report card' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    const data = await this.service.deleteReportCard(id, schoolId);
    return ApiResponse.success(data, 'Report card deleted successfully');
  }
}
