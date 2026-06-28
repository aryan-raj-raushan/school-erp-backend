import { Injectable } from '@nestjs/common';
import { AuditLogsRepository, type CreateAuditLogData, type AuditLogFilters } from './audit-logs.repository';

@Injectable()
export class AuditLogsService {
  constructor(private readonly repo: AuditLogsRepository) {}

  async log(data: CreateAuditLogData) {
    return this.repo.create(data);
  }

  async findAll(schoolId: string, filters: AuditLogFilters) {
    return this.repo.findAll(schoolId, filters);
  }
}
