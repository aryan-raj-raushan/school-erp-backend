import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { CacheTTL } from '../../shared/constants';
import { REDIS_STUDENT_KEY } from '../../shared/redis/redis-key';
import { BulkImportRepository } from './bulk-import.repository';

type Rows<K extends keyof BulkImportRepository> = Awaited<ReturnType<BulkImportRepository[K]>>;

/**
 * Reference data for imports, read cache-aside through Redis. Each key sits under the
 * owning module's prefix (academic_years:, classes:, sections:, roles:, finance:accounts:,
 * finance:heads:, students:…:list:) so that module's existing invalidation on every write
 * also refreshes these entries.
 */
@Injectable()
export class BulkImportLookups {
  constructor(
    private readonly repo: BulkImportRepository,
    private readonly redis: RedisService,
  ) {}

  academicYears(schoolId: string): Promise<Rows<'findAcademicYears'>> {
    return this.redis.getOrSet(`academic_years:${schoolId}:bulk-import`, CacheTTL.LONG, () =>
      this.repo.findAcademicYears(schoolId),
    );
  }

  classes(schoolId: string): Promise<Rows<'findClasses'>> {
    return this.redis.getOrSet(`classes:${schoolId}:bulk-import`, CacheTTL.LONG, () =>
      this.repo.findClasses(schoolId),
    );
  }

  sections(schoolId: string): Promise<Rows<'findSections'>> {
    return this.redis.getOrSet(`sections:${schoolId}:bulk-import`, CacheTTL.LONG, () =>
      this.repo.findSections(schoolId),
    );
  }

  async sectionStrength(schoolId: string): Promise<Map<string, number>> {
    const rows = await this.redis.getOrSet(
      `${REDIS_STUDENT_KEY.STUDENT(schoolId)}:list:bulk-import-section-strength`,
      CacheTTL.SHORT,
      () => this.repo.countBySection(schoolId),
    );
    return new Map(rows.map((r) => [r.section_id, r.total]));
  }

  roles(schoolId: string): Promise<Rows<'findRoles'>> {
    return this.redis.getOrSet(`roles:${schoolId}:bulk-import`, CacheTTL.MEDIUM, () =>
      this.repo.findRoles(schoolId),
    );
  }

  financeAccounts(schoolId: string): Promise<Rows<'findFinanceAccounts'>> {
    return this.redis.getOrSet(`finance:accounts:${schoolId}:bulk-import`, CacheTTL.MEDIUM, () =>
      this.repo.findFinanceAccounts(schoolId),
    );
  }

  financeHeads(schoolId: string): Promise<Rows<'findFinanceHeads'>> {
    return this.redis.getOrSet(`finance:heads:${schoolId}:bulk-import`, CacheTTL.MEDIUM, () =>
      this.repo.findFinanceHeads(schoolId),
    );
  }
}
