import { Controller, Get, Put, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationRulesService } from './notification-rules.service';
import { UpsertNotificationRuleDto } from './dto/upsert-notification-rule.dto';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PERMISSION_REGISTRY } from '../../shared/constants';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { ApiResponse } from '../../shared/responses/api-response';

@ApiTags('Notification Rules')
@ApiBearerAuth('access-token')
@Controller('notification-rules')
export class NotificationRulesController {
  constructor(private readonly service: NotificationRulesService) {}

  @Get()
  @Permissions(PERMISSION_REGISTRY.schoolSettings.view)
  @ApiOperation({ summary: 'Get all notification rules for school' })
  async list(@GetSchoolId() schoolId: string) {
    const data = await this.service.findAll(schoolId);
    return ApiResponse.success(data, 'Notification rules fetched');
  }

  @Put()
  @Permissions(PERMISSION_REGISTRY.schoolSettings.update)
  @ApiOperation({ summary: 'Upsert a notification rule' })
  async upsert(@GetSchoolId() schoolId: string, @Body() dto: UpsertNotificationRuleDto) {
    const data = await this.service.upsert(schoolId, dto);
    return ApiResponse.success(data, 'Notification rule saved');
  }
}
