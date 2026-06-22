import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BulkMarkAttendanceDto, FilterAttendanceDto } from './dto/exam-attendance.dto';
import { GetSchoolId } from '@common/decorators/school-id.decorator';
import { ApiResponse } from '@shared/responses/api-response';
import { GetCurrentUserId } from '@common/decorators/current-user.decorator';
import { ExamAttendanceService } from './exam-attendance.service';

@ApiTags('Exam – Attendance')
@ApiBearerAuth('access-token')
@Controller('exam/attendance')
export class ExamAttendanceController {
  constructor(private readonly service: ExamAttendanceService) {}

  @Get()
  @ApiOperation({ summary: 'List attendance records with filters' })
  async findAll(@GetSchoolId() schoolId: string, @Query() filters: FilterAttendanceDto) {
    const data = await this.service.findAll(schoolId, filters);
    return ApiResponse.success(data.items, 'Attendance records fetched successfully', data.meta);
  }

  @Get('schedule/:scheduleId')
  @ApiOperation({ summary: 'Get all student attendance for a specific schedule' })
  async findBySchedule(
    @Param('scheduleId', ParseUUIDPipe) scheduleId: string,
    @GetSchoolId() schoolId: string,
  ) {
    const data = await this.service.findBySchedule(scheduleId, schoolId);
    return ApiResponse.success(data, 'Attendance records fetched successfully');
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Bulk mark/update attendance for all students across all exam schedules',
  })
  async bulkMark(
    @Body() dto: BulkMarkAttendanceDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.service.bulkMark(dto, schoolId, userId);
    return ApiResponse.created(data, 'Attendance marked successfully');
  }
}
