import { Injectable } from '@nestjs/common';
import { AuditLogsRepository, type CreateAuditLogData } from './audit-logs.repository';
import { AuditLogFilterDto } from './dto/audit-log-filter.dto';

@Injectable()
export class AuditLogsService {
  constructor(private readonly repo: AuditLogsRepository) {}

  async log(data: CreateAuditLogData) {
    return this.repo.create(data);
  }

  async findAll(schoolId: string | null, filters: AuditLogFilterDto) {
    return this.repo.findAll(schoolId, filters);
  }
}
