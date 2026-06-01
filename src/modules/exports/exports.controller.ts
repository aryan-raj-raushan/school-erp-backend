import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExportsService } from './exports.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { SchoolRole } from '../../shared/enums';

const ALL_ROLES = [
  SchoolRole.SCHOOL_ADMIN,
  SchoolRole.PRINCIPAL,
  SchoolRole.VICE_PRINCIPAL,
  SchoolRole.TEACHER,
  SchoolRole.CLASS_TEACHER,
  SchoolRole.ACCOUNTANT,
];

@ApiTags('Export Queue')
@ApiBearerAuth('access-token')
@Controller('export')
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Get('status/:jobId')
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Poll export job status' })
  async getStatus(@Param('jobId') jobId: string) {
    const data = await this.exportsService.getJobStatus(jobId);
    return ApiResponse.success(data, 'Job status fetched');
  }

  @Get('download/:jobId')
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Download export file once DONE' })
  async download(@Param('jobId') jobId: string) {
    const data = await this.exportsService.getDownloadUrl(jobId);
    return ApiResponse.success(data, 'Download URL fetched');
  }
}
