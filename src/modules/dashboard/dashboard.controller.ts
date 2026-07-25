import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { ParentAccessible } from '../../common/decorators/parent-accessible.decorator';
import { GetCurrentStudentId } from '../../common/decorators/current-student-id.decorator';
import { ApiResponse } from '../../shared/responses/api-response';

@ApiTags('Dashboard')
@ApiBearerAuth('access-token')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('admin')
  @ApiOperation({ summary: 'Admin / Owner full dashboard — counts, charts, events, finance' })
  async adminDashboard(@GetSchoolId() schoolId: string) {
    const data = await this.dashboardService.getAdminDashboard(schoolId);
    return ApiResponse.success(data, 'Dashboard fetched');
  }

  @Get('teacher')
  @ApiOperation({ summary: 'Teacher dashboard — attendance, homework, exams' })
  async teacherDashboard(@GetSchoolId() schoolId: string, @GetCurrentUserId() userId: string) {
    const data = await this.dashboardService.getTeacherDashboard(schoolId, userId);
    return ApiResponse.success(data, 'Teacher dashboard fetched');
  }

  @Get('parent')
  @ParentAccessible()
  @ApiOperation({ summary: 'Parent dashboard — attendance, homework, exams, fees (own child)' })
  async parentDashboard(
    @GetSchoolId() schoolId: string,
    @GetCurrentStudentId() studentId: string,
  ) {
    const data = await this.dashboardService.getParentDashboard(schoolId, studentId);
    return ApiResponse.success(data, 'Parent dashboard fetched');
  }
}

@ApiTags('Reports')
@ApiBearerAuth('access-token')
@Controller('reports')
export class ReportsController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('admin')
  @ApiOperation({ summary: 'Admin analytics & reports summary' })
  async adminReports(@GetSchoolId() schoolId: string) {
    const data = await this.dashboardService.getAdminReports(schoolId);
    return ApiResponse.success(data, 'Admin reports fetched');
  }

  @Get('admin/subjects')
  @ApiOperation({ summary: 'Subject period allocation for a class section' })
  @ApiQuery({ name: 'class_section_id', required: true })
  async subjectAllocation(
    @GetSchoolId() schoolId: string,
    @Query('class_section_id') classSectionId: string,
  ) {
    const data = await this.dashboardService.getSubjectAllocation(schoolId, classSectionId);
    return ApiResponse.success(data, 'Subject allocation fetched');
  }
}
