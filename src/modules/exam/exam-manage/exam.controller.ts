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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExamService } from './exam.service';
import {
  CreateExamDto,
  UpdateExamDto,
  FilterExamDto,
  PublishExamDto,
  AutoGenerateExamDto,
  ChangeExamStatusDto,
  CopyExamDto,
  RegenerateApplyDto,
} from './dto/exam.dto';
import { GetSchoolId } from '../../../common/decorators/school-id.decorator';
import { GetCurrentUserId } from '../../../common/decorators/current-user.decorator';
import { ApiResponse } from '../../../shared/responses/api-response';

@ApiTags('Exam – Manage')
@ApiBearerAuth('access-token')
@Controller('exam/exams')
export class ExamController {
  constructor(private readonly service: ExamService) {}

  @Get()
  @ApiOperation({ summary: 'List exams with filters (academic year, class, term, published)' })
  async findAll(@GetSchoolId() schoolId: string, @Query() filters: FilterExamDto) {
    const data = await this.service.findAll(schoolId, filters);
    return ApiResponse.success(data.items, 'Exams fetched successfully', data.meta);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get exam by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    const data = await this.service.findById(id, schoolId);
    return ApiResponse.success(data, 'Exam fetched successfully');
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new exam' })
  async create(
    @Body() dto: CreateExamDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.service.create(dto, schoolId, userId);
    return ApiResponse.created(data, 'Exam created successfully');
  }

  @Post('auto-generate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Auto-generate a whole-school exam',
    description:
      'Creates an exam spanning the given classes, pulling each class’s subjects from ' +
      'the class-subject-teacher mapping and auto-distributing them across working days ' +
      '(skipping holidays) with conflict-free invigilator assignment. Unresolvable items ' +
      'are returned in `conflicts` rather than blocking creation.',
  })
  async autoGenerate(
    @Body() dto: AutoGenerateExamDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.service.autoGenerate(dto, schoolId, userId);
    return ApiResponse.created(data, 'Exam auto-generated successfully');
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update exam details' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateExamDto,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.service.update(id, schoolId, dto, userId);
    return ApiResponse.success(data, 'Exam updated successfully');
  }

  @Patch(':id/publish')
  @ApiOperation({ summary: 'Publish or un-publish an exam schedule' })
  async publish(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: PublishExamDto,
  ) {
    const data = await this.service.publish(id, schoolId, dto);
    return ApiResponse.success(
      data,
      `Exam ${dto.is_published ? 'published' : 'un-published'} successfully`,
    );
  }

  @Post(':id/regenerate-preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Preview a schedule regeneration without writing anything',
    description:
      'Computes what auto-generate would produce for this exam and diffs it against the ' +
      'current schedule — returns to_create/to_replace/unchanged/locked so the caller can ' +
      'confirm before applying.',
  })
  async regeneratePreview(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: AutoGenerateExamDto,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.service.regeneratePreview(id, schoolId, dto, userId);
    return ApiResponse.success(data, 'Regeneration preview computed');
  }

  @Post(':id/regenerate-apply')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Apply a schedule regeneration',
    description:
      'Creates/replaces schedule rows per the same computation as preview. Locked rows are ' +
      'never touched; rows with attendance already recorded require force=true.',
  })
  async regenerateApply(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: RegenerateApplyDto,
    @GetCurrentUserId() userId: string,
  ) {
    const { force, ...rest } = dto;
    const data = await this.service.regenerateApply(id, schoolId, rest, userId, force ?? false);
    return ApiResponse.success(data, 'Schedule regenerated');
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Transition exam lifecycle status',
    description:
      'Validates the move is an allowed next step, and blocks moving to PUBLISHED unless ' +
      'every non-locked schedule row has both a hall and an invigilator assigned.',
  })
  async changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: ChangeExamStatusDto,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.service.changeStatus(id, schoolId, dto, userId);
    return ApiResponse.success(data, `Exam moved to ${dto.status}`);
  }

  @Post(':id/copy')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Copy an exam to another academic year',
    description:
      'Clones the exam, its participating classes, and its top-level schedule rows into a ' +
      'new academic year, shifting dates by the same delta as the new start date. Does not ' +
      'clone sitting plans, attendance, or marks. New exam starts in DRAFT.',
  })
  async copy(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: CopyExamDto,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.service.copy(id, schoolId, dto, userId);
    return ApiResponse.created(data, 'Exam copied successfully');
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted exam' })
  async restore(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    const data = await this.service.restore(id, schoolId);
    return ApiResponse.success(data, 'Exam restored successfully');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete an exam' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    await this.service.remove(id, schoolId, userId);
    return ApiResponse.noContent('Exam deleted successfully');
  }
}
