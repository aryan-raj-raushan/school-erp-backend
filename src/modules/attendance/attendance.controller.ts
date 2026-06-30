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
  Ip,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import {
  AttendanceFilterDto,
  AttendanceExportFilterDto,
  StudentAttendanceFilterDto,
  DefaultersFilterDto,
} from './dto/attendance-filter.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { GetCurrentUserId, GetCurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { PERMISSION_REGISTRY } from '../../shared/constants/permissions.registry';
import { RequestUser } from '../../shared/types/jwt-payload.types';
import { SchoolRole } from '../../shared/enums/roles.enum';

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

  // ── Named sub-routes MUST come before `:attendanceId` ──────────────────────

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
  async enqueueExport(@GetSchoolId() schoolId: string, @Query() filters: AttendanceExportFilterDto) {
    const data = await this.attendanceService.enqueueExport(schoolId, filters);
    return ApiResponse.success(data, 'Export job enqueued');
  }

  @Get('heatmap')
  @ApiOperation({ summary: 'Attendance heatmap for a student over a year' })
  @ApiQuery({ name: 'studentId', required: true })
  @ApiQuery({ name: 'year', required: true, type: Number })
  async getHeatmap(
    @GetSchoolId() schoolId: string,
    @Query('studentId') studentId: string,
    @Query('year') year: string,
  ) {
    const data = await this.attendanceService.getHeatmap(schoolId, studentId, Number(year));
    return ApiResponse.success(data, 'Heatmap fetched');
  }

  @Get('late-trend')
  @ApiOperation({ summary: 'Late arrival trend by date for a class section' })
  @ApiQuery({ name: 'class_section_id', required: true })
  @ApiQuery({ name: 'month', required: true, type: Number })
  @ApiQuery({ name: 'year', required: true, type: Number })
  async getLateTrend(
    @GetSchoolId() schoolId: string,
    @Query('class_section_id') classSectionId: string,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    const data = await this.attendanceService.getLateTrend(schoolId, classSectionId, Number(month), Number(year));
    return ApiResponse.success(data, 'Late trend fetched');
  }

  @Get('conflicts')
  @Permissions(PERMISSION_REGISTRY.attendance.update)
  @ApiOperation({ summary: 'Unresolved attendance conflicts' })
  @ApiQuery({ name: 'date', required: false })
  async getConflicts(@GetSchoolId() schoolId: string, @Query('date') date?: string) {
    const data = await this.attendanceService.getConflicts(schoolId, date);
    return ApiResponse.success(data, 'Conflicts fetched');
  }

  @Get('missing-punches')
  @Permissions(PERMISSION_REGISTRY.attendance.update)
  @ApiOperation({ summary: 'Students with RFID entry but no exit for a date' })
  @ApiQuery({ name: 'date', required: true })
  async getMissingPunches(
    @GetSchoolId() schoolId: string,
    @Query('date') date: string,
  ) {
    const data = await this.attendanceService.getMissingPunches(schoolId, date);
    return ApiResponse.success(data, 'Missing punches fetched successfully');
  }

  @Get('dashboard/today')
  @ApiOperation({ summary: 'Today attendance summary for dashboard' })
  async getTodayDashboard(@GetSchoolId() schoolId: string) {
    const data = await this.attendanceService.getTodayDashboard(schoolId);
    return ApiResponse.success(data, 'Today dashboard fetched');
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

  // ── Wildcard param route — keep AFTER all named routes ─────────────────────

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

  // ── Mutation routes ─────────────────────────────────────────────────────────

  @Put('conflicts/:conflictId/resolve')
  @Permissions(PERMISSION_REGISTRY.attendance.update)
  @ApiOperation({ summary: 'Resolve an attendance conflict' })
  async resolveConflict(
    @Param('conflictId') conflictId: string,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
    @Body() body: { resolution: 'RFID_WON' | 'MANUAL_WON' | 'ADMIN_SET' },
  ) {
    const data = await this.attendanceService.resolveConflict(conflictId, schoolId, body.resolution, userId);
    return ApiResponse.success(data, 'Conflict resolved');
  }

  @Put('missing-punches/:punchId/resolve')
  @Permissions(PERMISSION_REGISTRY.attendance.update)
  @ApiOperation({ summary: 'Resolve a missing exit punch — mark attendance as PRESENT or HALF_DAY' })
  async resolveMissingPunch(
    @Param('punchId') punchId: string,
    @GetSchoolId() schoolId: string,
    @Body() body: { status: 'PRESENT' | 'HALF_DAY' },
  ) {
    await this.attendanceService.resolveMissingPunch(punchId, schoolId, body.status);
    return ApiResponse.success(null, 'Missing punch resolved successfully');
  }

  @Put(':attendanceId')
  @Permissions(PERMISSION_REGISTRY.attendance.update)
  @ApiOperation({ summary: 'Update an attendance record' })
  async update(
    @Param('attendanceId', ParseUUIDPipe) attendanceId: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateAttendanceDto,
    @GetCurrentUser() user: RequestUser,
    @GetCurrentUserId() userId: string,
    @Ip() ip: string,
  ) {
    const isAdmin = user?.role === SchoolRole.SCHOOL_ADMIN || user?.role === SchoolRole.PRINCIPAL;
    const data = await this.attendanceService.update(attendanceId, schoolId, dto, isAdmin, userId, ip);
    return ApiResponse.success(data, 'Attendance updated successfully');
  }

  @Get(':attendanceId/audit')
  @Permissions(PERMISSION_REGISTRY.attendance.update)
  @ApiOperation({ summary: 'Audit log for a single attendance record' })
  async getAuditLog(
    @Param('attendanceId', ParseUUIDPipe) attendanceId: string,
    @GetSchoolId() schoolId: string,
  ) {
    const data = await this.attendanceService.getAuditLog(attendanceId, schoolId);
    return ApiResponse.success(data, 'Audit log fetched successfully');
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
