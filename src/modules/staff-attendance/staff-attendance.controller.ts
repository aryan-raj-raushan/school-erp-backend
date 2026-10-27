import { Controller, Get, Post, Body, Query, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { StaffAttendanceService } from './staff-attendance.service';
import {
  MarkStaffAttendanceDto,
  StaffAttendanceExportDto,
  StaffAttendanceRangeDto,
} from './dto/staff-attendance.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PERMISSION_REGISTRY } from '../../shared/constants';
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

  @Get()
  @ApiOperation({ summary: 'Get staff attendance for a date range (max 366 days)' })
  async getByRange(@GetSchoolId() schoolId: string, @Query() dto: StaffAttendanceRangeDto) {
    const data = await this.service.getByRange(schoolId, dto);
    return ApiResponse.success(data, 'Staff attendance fetched');
  }

  @Get('export')
  @Permissions(PERMISSION_REGISTRY.reports.export)
  @ApiOperation({ summary: 'Download staff attendance for a date range as xlsx or csv' })
  async export(
    @GetSchoolId() schoolId: string,
    @Query() dto: StaffAttendanceExportDto,
    @Res() res: Response,
  ) {
    const { buffer, filename, contentType } = await this.service.generateExport(schoolId, dto);
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
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
