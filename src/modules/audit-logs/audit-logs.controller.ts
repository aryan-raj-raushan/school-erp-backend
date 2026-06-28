import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuditLogsService } from './audit-logs.service';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import type { AuditLogFilters } from './audit-logs.repository';

@ApiTags('Audit Logs')
@ApiBearerAuth('access-token')
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly service: AuditLogsService) {}

  @Get()
  async findAll(
    @GetSchoolId() schoolId: string,
    @Query('entity') entity?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const filters: AuditLogFilters = {
      ...(entity && { entity: entity as AuditLogFilters['entity'] }),
      ...(action && { action: action as AuditLogFilters['action'] }),
      ...(from && { from }),
      ...(to && { to }),
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    };
    const items = await this.service.findAll(schoolId, filters);
    return { items, total: items.length };
  }
}
