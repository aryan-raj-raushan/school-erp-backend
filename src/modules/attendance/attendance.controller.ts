import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import {
  AttendanceFilterDto,
  StudentAttendanceFilterDto,
  DefaultersFilterDto,
} from './dto/attendance-filter.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { PERMISSION_REGISTRY } from '../../shared/constants/permissions.registry';

@ApiTags('Attendance')
@ApiBearerAuth('access-token')
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post()
  @Permissions(PERMISSION_REGISTRY.attendance.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Mark attendance — single or bulk' })
  async mark(
    @Body() dto: MarkAttendanceDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.attendanceService.mark(dto, schoolId, userId);
    return ApiResponse.created(data, 'Attendance marked successfully');
  }

  @Get('daily')
  @ApiOperation({ summary: 'Daily attendance report for a class section' })
  @ApiQuery({ name: 'class_section_id', required: true })
  @ApiQuery({ name: 'date', required: true })
  async getDailyReport(
    @GetSchoolId() schoolId: string,
    @Query('class_section_id') classSectionId: string,
    @Query('date') date: string,
  ) {
    const data = await this.attendanceService.getDailyReport(schoolId, classSectionId, date);
    return ApiResponse.success(data, 'Daily attendance report fetched successfully');
  }

  @Get('monthly')
  @ApiOperation({ summary: 'Monthly attendance summary per student' })
  @ApiQuery({ name: 'class_section_id', required: true })
  @ApiQuery({ name: 'year', required: true, type: Number })
  @ApiQuery({ name: 'month', required: true, type: Number })
  async getMonthlySummary(
    @GetSchoolId() schoolId: string,
    @Query('class_section_id') classSectionId: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    const data = await this.attendanceService.getMonthlySummary(
      schoolId,
      classSectionId,
      Number(year),
      Number(month),
    );
    return ApiResponse.success(data, 'Monthly attendance summary fetched successfully');
  }

  @Get('defaulters')
  @ApiOperation({ summary: 'Students below attendance threshold' })
  async getDefaulters(@GetSchoolId() schoolId: string, @Query() filters: DefaultersFilterDto) {
    const data = await this.attendanceService.getDefaulters(schoolId, filters);
    return ApiResponse.success(data, 'Defaulters fetched successfully');
  }

  @Get('export')
  @Permissions(PERMISSION_REGISTRY.reports.export)
  @ApiOperation({ summary: 'Enqueue attendance export job' })
  async enqueueExport(@GetSchoolId() schoolId: string, @Query() filters: AttendanceFilterDto) {
    const data = await this.attendanceService.enqueueExport(schoolId, filters);
    return ApiResponse.success(data, 'Export job enqueued');
  }

  @Get('students/:studentId')
  @ApiOperation({ summary: 'Student attendance history with pagination' })
  async getStudentHistory(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @GetSchoolId() schoolId: string,
    @Query() filters: StudentAttendanceFilterDto,
  ) {
    const data = await this.attendanceService.getStudentHistory(studentId, schoolId, filters);
    return ApiResponse.success(
      { records: data.items, stats: data.stats },
      'Student attendance fetched successfully',
      data.meta,
    );
  }

  @Get('students/:studentId/summary')
  @ApiOperation({ summary: 'Overall + monthly summary for a student' })
  async getStudentSummary(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @GetSchoolId() schoolId: string,
    @Query('academic_year_id') academicYearId?: string,
  ) {
    const data = await this.attendanceService.getStudentSummary(
      studentId,
      schoolId,
      academicYearId,
    );
    return ApiResponse.success(data, 'Student attendance summary fetched successfully');
  }

  @Get('classSection/:id')
  @ApiOperation({ summary: 'Section attendance overview — date range' })
  @ApiQuery({ name: 'from_date', required: true })
  @ApiQuery({ name: 'to_date', required: true })
  async getSectionAttendance(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolId() schoolId: string,
    @Query('from_date') from_date: string,
    @Query('to_date') to_date: string,
  ) {
    const data = await this.attendanceService.getSectionAttendance(
      schoolId,
      id,
      from_date,
      to_date,
    );
    return ApiResponse.success(data, 'Section attendance fetched successfully');
  }

  @Get('classSection/:id/date/:date')
  @ApiOperation({ summary: 'Section attendance for a specific date' })
  async getSectionAttendanceByDate(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('date') date: string,
    @GetSchoolId() schoolId: string,
  ) {
    const data = await this.attendanceService.getSectionAttendanceByDate(schoolId, id, date);
    return ApiResponse.success(data, 'Section attendance fetched successfully');
  }

  @Get(':attendanceId')
  @ApiOperation({ summary: 'Get single attendance record by ID' })
  async findOne(
    @Param('attendanceId', ParseUUIDPipe) attendanceId: string,
    @GetSchoolId() schoolId: string,
  ) {
    const data = await this.attendanceService.findById(attendanceId, schoolId);
    return ApiResponse.success(data, 'Attendance record fetched successfully');
  }

  @Get()
  @ApiOperation({ summary: "Get today's / specific-date attendance" })
  async findAll(@GetSchoolId() schoolId: string, @Query() filters: AttendanceFilterDto) {
    const data = await this.attendanceService.findAll(schoolId, filters);
    return ApiResponse.success(data.items, 'Attendance fetched successfully', data.meta);
  }

  @Put(':attendanceId')
  @Permissions(PERMISSION_REGISTRY.attendance.update)
  @ApiOperation({ summary: 'Update an attendance record' })
  async update(
    @Param('attendanceId', ParseUUIDPipe) attendanceId: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateAttendanceDto,
  ) {
    const data = await this.attendanceService.update(attendanceId, schoolId, dto);
    return ApiResponse.success(data, 'Attendance updated successfully');
  }

  @Delete(':attendanceId')
  @Permissions(PERMISSION_REGISTRY.attendance.update)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an attendance record' })
  async remove(
    @Param('attendanceId', ParseUUIDPipe) attendanceId: string,
    @GetSchoolId() schoolId: string,
  ) {
    await this.attendanceService.remove(attendanceId, schoolId);
    return ApiResponse.noContent('Attendance record deleted successfully');
  }
}
