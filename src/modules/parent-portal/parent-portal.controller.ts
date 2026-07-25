import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ParentPortalService } from './parent-portal.service';
import { ParentAccessible } from '../../common/decorators/parent-accessible.decorator';
import { GetCurrentStudentId } from '../../common/decorators/current-student-id.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { StudentAttendanceFilterDto } from '../attendance/dto/attendance-filter.dto';

@ApiTags('Parent Portal — Attendance')
@ApiBearerAuth('access-token')
@Controller('parent-portal/attendance')
export class ParentPortalAttendanceController {
  constructor(private readonly parentPortalService: ParentPortalService) {}

  @Get('summary')
  @ParentAccessible()
  @ApiOperation({ summary: "Parent: my child's attendance summary" })
  async summary(@GetSchoolId() schoolId: string, @GetCurrentStudentId() studentId: string) {
    const data = await this.parentPortalService.getAttendanceSummary(studentId, schoolId);
    return ApiResponse.success(data, 'Attendance summary fetched');
  }

  @Get('history')
  @ParentAccessible()
  @ApiOperation({ summary: "Parent: my child's attendance history" })
  async history(
    @GetSchoolId() schoolId: string,
    @GetCurrentStudentId() studentId: string,
    @Query() filters: StudentAttendanceFilterDto,
  ) {
    const data = await this.parentPortalService.getAttendanceHistory(studentId, schoolId, filters);
    return ApiResponse.success(data, 'Attendance history fetched');
  }
}

@ApiTags('Parent Portal — Fees')
@ApiBearerAuth('access-token')
@Controller('parent-portal/fees')
export class ParentPortalFeesController {
  constructor(private readonly parentPortalService: ParentPortalService) {}

  @Get('bills')
  @ParentAccessible()
  @ApiOperation({ summary: "Parent: my child's fee bills" })
  async bills(@GetSchoolId() schoolId: string, @GetCurrentStudentId() studentId: string) {
    const data = await this.parentPortalService.getFeeBills(studentId, schoolId);
    return ApiResponse.success(data, 'Fee bills fetched');
  }
}

@ApiTags('Parent Portal — Homework')
@ApiBearerAuth('access-token')
@Controller('parent-portal/homework')
export class ParentPortalHomeworkController {
  constructor(private readonly parentPortalService: ParentPortalService) {}

  @Get()
  @ParentAccessible()
  @ApiOperation({ summary: "Parent: my child's homework list with submission status" })
  async findAll(@GetSchoolId() schoolId: string, @GetCurrentStudentId() studentId: string) {
    const data = await this.parentPortalService.getHomework(studentId, schoolId);
    return ApiResponse.success(data, 'Homework fetched');
  }
}

@ApiTags('Parent Portal — Timetable')
@ApiBearerAuth('access-token')
@Controller('parent-portal/timetable')
export class ParentPortalTimetableController {
  constructor(private readonly parentPortalService: ParentPortalService) {}

  @Get('today')
  @ParentAccessible()
  @ApiOperation({ summary: "Parent: my child's timetable for today" })
  async today(@GetSchoolId() schoolId: string, @GetCurrentStudentId() studentId: string) {
    const data = await this.parentPortalService.getTimetableToday(studentId, schoolId);
    return ApiResponse.success(data, "Today's timetable fetched");
  }

  @Get('week')
  @ParentAccessible()
  @ApiOperation({ summary: "Parent: my child's full weekly timetable" })
  async week(@GetSchoolId() schoolId: string, @GetCurrentStudentId() studentId: string) {
    const data = await this.parentPortalService.getTimetableWeek(studentId, schoolId);
    return ApiResponse.success(data, 'Weekly timetable fetched');
  }
}

@ApiTags('Parent Portal — Exams')
@ApiBearerAuth('access-token')
@Controller('parent-portal/exams')
export class ParentPortalExamsController {
  constructor(private readonly parentPortalService: ParentPortalService) {}

  @Get('schedule')
  @ParentAccessible()
  @ApiOperation({ summary: "Parent: my child's upcoming exam schedule" })
  async schedule(@GetSchoolId() schoolId: string, @GetCurrentStudentId() studentId: string) {
    const data = await this.parentPortalService.getUpcomingExamSchedule(studentId, schoolId);
    return ApiResponse.success(data, 'Exam schedule fetched');
  }
}

@ApiTags('Parent Portal — Results')
@ApiBearerAuth('access-token')
@Controller('parent-portal/results')
export class ParentPortalResultsController {
  constructor(private readonly parentPortalService: ParentPortalService) {}

  @Get('report-cards')
  @ParentAccessible()
  @ApiOperation({ summary: "Parent: my child's published report cards" })
  async reportCards(@GetSchoolId() schoolId: string, @GetCurrentStudentId() studentId: string) {
    const data = await this.parentPortalService.getReportCards(studentId, schoolId);
    return ApiResponse.success(data.items, 'Report cards fetched', data.meta);
  }
}

@ApiTags('Parent Portal — Gate Passes')
@ApiBearerAuth('access-token')
@Controller('parent-portal/gate-passes')
export class ParentPortalGatePassesController {
  constructor(private readonly parentPortalService: ParentPortalService) {}

  @Get()
  @ParentAccessible()
  @ApiOperation({ summary: "Parent: my child's gate pass history" })
  async findAll(@GetSchoolId() schoolId: string, @GetCurrentStudentId() studentId: string) {
    const data = await this.parentPortalService.getGatePasses(studentId, schoolId);
    return ApiResponse.success(data, 'Gate passes fetched');
  }
}

@ApiTags('Parent Portal — Movements')
@ApiBearerAuth('access-token')
@Controller('parent-portal/movements')
export class ParentPortalMovementsController {
  constructor(private readonly parentPortalService: ParentPortalService) {}

  @Get()
  @ParentAccessible()
  @ApiOperation({ summary: "Parent: my child's on-campus movement history" })
  async findAll(@GetSchoolId() schoolId: string, @GetCurrentStudentId() studentId: string) {
    const data = await this.parentPortalService.getMovements(studentId, schoolId);
    return ApiResponse.success(data, 'Movements fetched');
  }
}

@ApiTags('Parent Portal — Profile')
@ApiBearerAuth('access-token')
@Controller('parent-portal/profile')
export class ParentPortalProfileController {
  constructor(private readonly parentPortalService: ParentPortalService) {}

  @Get()
  @ParentAccessible()
  @ApiOperation({ summary: "Parent: my child's profile, guardians and pickup card" })
  async profile(@GetSchoolId() schoolId: string, @GetCurrentStudentId() studentId: string) {
    const data = await this.parentPortalService.getProfile(studentId, schoolId);
    return ApiResponse.success(data, 'Profile fetched');
  }
}
