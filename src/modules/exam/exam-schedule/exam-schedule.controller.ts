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
import { ExamScheduleService } from './exam-schedule.service';
import {
  CreateExamScheduleBulkDto,
  UpdateExamScheduleDto,
  FilterExamScheduleDto,
  BulkLockScheduleDto,
  BulkUpdateScheduleDto,
  BulkDeleteScheduleDto,
} from './dto/exam-schedule.dto';
import { GetSchoolId } from '@common/decorators/school-id.decorator';
import { ApiResponse } from '@shared/responses/api-response';
import { GetCurrentUserId } from '@common/decorators/current-user.decorator';

@ApiTags('Exam – Schedule')
@ApiBearerAuth('access-token')
@Controller('exam/schedules')
export class ExamScheduleController {
  constructor(private readonly service: ExamScheduleService) {}

  @Get()
  @ApiOperation({ summary: 'List exam schedules with filters' })
  async findAll(@GetSchoolId() schoolId: string, @Query() filters: FilterExamScheduleDto) {
    const data = await this.service.findAll(schoolId, filters);
    return ApiResponse.success(data.items, 'Exam schedules fetched successfully', data.meta);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get exam schedule by ID (includes sub-schedules)' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    const data = await this.service.findWithSubSchedules(id, schoolId);
    return ApiResponse.success(data, 'Exam schedule fetched successfully');
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Bulk create exam schedules (main + sub-subjects) for an exam',
  })
  async bulkCreate(
    @Body() dto: CreateExamScheduleBulkDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.service.bulkCreate(dto, schoolId, userId);
    return ApiResponse.created(data, 'Exam schedules created successfully');
  }

  @Patch('bulk-lock')
  @ApiOperation({ summary: 'Lock or unlock a set of schedule rows' })
  async bulkLock(
    @Body() dto: BulkLockScheduleDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    await this.service.bulkLock(dto, schoolId, userId);
    return ApiResponse.success(null, `${dto.ids.length} schedule(s) ${dto.locked ? 'locked' : 'unlocked'}`);
  }

  @Patch('bulk-update')
  @ApiOperation({
    summary: 'Apply the same field changes to multiple (unlocked) schedule rows',
    description: 'Re-checks the class+time conflict per row; failures are reported non-blockingly.',
  })
  async bulkUpdate(
    @Body() dto: BulkUpdateScheduleDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.service.bulkUpdate(dto, schoolId, userId);
    return ApiResponse.success(data, `${data.updated.length} schedule(s) updated`);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a single exam schedule entry' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateExamScheduleDto,
    // @GetCurrentUserId() userId: string,
  ) {
    const data = await this.service.update(id, schoolId, dto);
    return ApiResponse.success(data, 'Exam schedule updated successfully');
  }

  @Delete('bulk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete multiple (unlocked) schedule entries' })
  async bulkRemove(
    @Body() dto: BulkDeleteScheduleDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    await this.service.bulkRemove(dto, schoolId, userId);
    return ApiResponse.noContent('Exam schedules deleted successfully');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete exam schedule entry (also removes sub-schedules)' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @GetSchoolId() schoolId: string) {
    await this.service.remove(id, schoolId);
    return ApiResponse.noContent('Exam schedule deleted successfully');
  }
}
