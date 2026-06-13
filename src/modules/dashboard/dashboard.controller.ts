import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { ApiResponse } from '../../shared/responses/api-response';

@ApiTags('Dashboard')
@ApiBearerAuth('access-token')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('admin')
  @ApiOperation({ summary: 'Admin / Owner dashboard summary' })
  async adminDashboard(@GetSchoolId() schoolId: string) {
    const data = await this.dashboardService.getAdminDashboard(schoolId);
    return ApiResponse.success(data, 'Admin dashboard fetched successfully');
  }

  @Get('teacher')
  @ApiOperation({ summary: 'Teacher dashboard summary' })
  async teacherDashboard(@GetSchoolId() schoolId: string, @GetCurrentUserId() userId: string) {
    const data = await this.dashboardService.getTeacherDashboard(schoolId, userId);
    return ApiResponse.success(data, 'Teacher dashboard fetched successfully');
  }

  @Get('parent')
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
  @ApiOperation({ summary: 'Admin analytics & reports summary' })
  async adminReports(@GetSchoolId() schoolId: string) {
    const data = await this.dashboardService.getAdminReports(schoolId);
    return ApiResponse.success(data, 'Admin reports fetched successfully');
  }

  @Get('admin/subjects')
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
