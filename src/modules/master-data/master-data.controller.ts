import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MasterDataService } from './master-data.service';
import { ApiResponse } from '../../shared/responses/api-response';

@ApiTags('Master Data')
@ApiBearerAuth('access-token')
@Controller('master-data')
export class MasterDataController {
  constructor(private readonly masterDataService: MasterDataService) {}

  @Get('subjects')
  @ApiOperation({ summary: 'Get all master subjects available in the system' })
  async findAllSubjects() {
    const data = await this.masterDataService.findAllSubjects();
    return ApiResponse.success(data, 'Master subjects fetched successfully');
  }
}
