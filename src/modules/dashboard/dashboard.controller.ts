import { Controller, Get, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { SchoolRole } from '../../shared/enums';

@ApiTags('Dashboard')
@ApiBearerAuth('access-token')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('admin')
  @Roles(SchoolRole.SCHOOL_ADMIN, SchoolRole.PRINCIPAL, SchoolRole.VICE_PRINCIPAL, SchoolRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Admin / Owner dashboard summary' })
  async adminDashboard(@GetSchoolId() schoolId: string) {
    const data = await this.dashboardService.getAdminDashboard(schoolId);
    return ApiResponse.success(data, 'Admin dashboard fetched successfully');
  }

  @Get('teacher')
  @Roles(SchoolRole.TEACHER, SchoolRole.CLASS_TEACHER, SchoolRole.PRINCIPAL, SchoolRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Teacher dashboard summary' })
  async teacherDashboard(@GetSchoolId() schoolId: string, @GetCurrentUserId() userId: string) {
    const data = await this.dashboardService.getTeacherDashboard(schoolId, userId);
    return ApiResponse.success(data, 'Teacher dashboard fetched successfully');
  }

  @Get('parent')
  @Roles(SchoolRole.SCHOOL_ADMIN, SchoolRole.PRINCIPAL, SchoolRole.CLASS_TEACHER)
  @ApiOperation({ summary: 'Parent dashboard summary' })
  async parentDashboard(@GetSchoolId() schoolId: string, @GetCurrentUserId() userId: string) {
    const data = await this.dashboardService.getParentDashboard(schoolId, userId);
    return ApiResponse.success(data, 'Parent dashboard fetched successfully');
  }
}

@ApiTags('Reports')
@ApiBearerAuth('access-token')
@Controller('reports')
export class ReportsController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('admin')
  @Roles(SchoolRole.SCHOOL_ADMIN, SchoolRole.PRINCIPAL, SchoolRole.VICE_PRINCIPAL, SchoolRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Admin analytics & reports summary' })
  async adminReports(@GetSchoolId() schoolId: string) {
    const data = await this.dashboardService.getAdminReports(schoolId);
    return ApiResponse.success(data, 'Admin reports fetched successfully');
  }

  @Get('admin/subjects')
  @Roles(SchoolRole.SCHOOL_ADMIN, SchoolRole.PRINCIPAL, SchoolRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Subject period allocation for a class section' })
  @ApiQuery({ name: 'class_section_id', required: true })
  async subjectAllocation(
    @GetSchoolId() schoolId: string,
    @Query('class_section_id') classSectionId: string,
  ) {
    const data = await this.dashboardService.getSubjectAllocation(schoolId, classSectionId);
    return ApiResponse.success(data, 'Subject allocation fetched successfully');
  }
}
