import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExportsService } from './exports.service';
import { ApiResponse } from '../../shared/responses/api-response';

@ApiTags('Export Queue')
@ApiBearerAuth('access-token')
@Controller('export')
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Get('status/:jobId')
  @ApiOperation({ summary: 'Poll export job status' })
  async getStatus(@Param('jobId') jobId: string) {
    const data = await this.exportsService.getJobStatus(jobId);
    return ApiResponse.success(data, 'Job status fetched');
  }

  @Get('download/:jobId')
  @ApiOperation({ summary: 'Download export file once DONE' })
  async download(@Param('jobId') jobId: string) {
    const data = await this.exportsService.getDownloadUrl(jobId);
    return ApiResponse.success(data, 'Download URL fetched');
  }
}
