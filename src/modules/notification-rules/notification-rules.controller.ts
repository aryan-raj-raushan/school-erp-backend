import { Controller, Get, Put, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationRulesService, UpsertNotificationRuleDto } from './notification-rules.service';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { ApiResponse } from '../../shared/responses/api-response';

@ApiTags('Notification Rules')
@ApiBearerAuth('access-token')
@Controller('notification-rules')
export class NotificationRulesController {
  constructor(private readonly service: NotificationRulesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all notification rules for school' })
  async list(@GetSchoolId() schoolId: string) {
    const data = await this.service.findAll(schoolId);
    return ApiResponse.success(data, 'Notification rules fetched');
  }

  @Put()
  @ApiOperation({ summary: 'Upsert a notification rule' })
  async upsert(@GetSchoolId() schoolId: string, @Body() dto: UpsertNotificationRuleDto) {
    const data = await this.service.upsert(schoolId, dto);
    return ApiResponse.success(data, 'Notification rule saved');
  }
}
