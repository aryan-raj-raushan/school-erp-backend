import { Controller, Get, Post, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { StaffAttendanceService } from './staff-attendance.service';
import { MarkStaffAttendanceDto } from './dto/staff-attendance.dto';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { ApiResponse } from '../../shared/responses/api-response';

@ApiTags('Staff Attendance')
@ApiBearerAuth('access-token')
@Controller('staff-attendance')
export class StaffAttendanceController {
  constructor(private readonly service: StaffAttendanceService) {}

  @Get('staff')
  @ApiOperation({ summary: 'List all active staff for the school' })
  async getStaff(@GetSchoolId() schoolId: string) {
    const data = await this.service.getStaff(schoolId);
    return ApiResponse.success(data, 'Staff fetched successfully');
  }

  @Get('daily')
  @ApiOperation({ summary: 'Get staff attendance for a date' })
  @ApiQuery({ name: 'date', required: true })
  async getByDate(@GetSchoolId() schoolId: string, @Query('date') date: string) {
    const data = await this.service.getByDate(schoolId, date);
    return ApiResponse.success(data, 'Staff attendance fetched');
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Mark staff attendance' })
  async mark(
    @Body() dto: MarkStaffAttendanceDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.service.mark(dto, schoolId, userId);
    return ApiResponse.created(data, 'Staff attendance marked');
  }
}
