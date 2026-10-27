import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogFilterDto } from './dto/audit-log-filter.dto';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PERMISSION_REGISTRY } from '../../shared/constants';

@ApiTags('Audit Logs')
@ApiBearerAuth('access-token')
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly service: AuditLogsService) {}

  @Get()
  @Permissions(PERMISSION_REGISTRY.schoolSettings.view)
  @ApiOperation({
    summary: 'School audit log — or platform-level log for a SUPER_ADMIN outside a school',
  })
  async findAll(@GetSchoolId() schoolId: string | undefined, @Query() filters: AuditLogFilterDto) {
    return this.service.findAll(schoolId ?? null, filters);
  }
}
