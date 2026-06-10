import { Injectable, Logger } from '@nestjs/common';
import { PromotionsRepository } from './promotions.repository';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { PromoteStudentsDto } from './dto/promote-students.dto';
import { PromotionFilterDto } from './dto/promotion-filter.dto';
import { PromotionLog, NewPromotionLog } from './types/promotion.types';
import { PaginationResponse } from '../../shared/responses/api-response';
import { PromotionStatus } from '../../shared/enums';
import { CacheTTL } from '../../shared/constants';

@Injectable()
export class PromotionsService {
  private readonly logger = new Logger(PromotionsService.name);

  constructor(
    private readonly promotionsRepo: PromotionsRepository,
    private readonly redisService: RedisService,
  ) {}

  async bulkPromote(
    schoolId: string,
    dto: PromoteStudentsDto,
    promotedBy: string,
  ): Promise<{ batchId: string; promoted: number; failed: number; logs: PromotionLog[] }> {
    const batchId = generateId();
    const isBulk = dto.promotions.length > 1;

    const logRecords: NewPromotionLog[] = dto.promotions.map((item) => ({
      id: generateId(),
      school_id: schoolId,
      student_id: item.student_id,
      from_academic_year_id: dto.from_academic_year_id,
      to_academic_year_id: dto.to_academic_year_id,
      from_class_id: null,
      to_class_id: item.to_class_id,
      to_section_id: item.to_section_id ?? null,
      status: PromotionStatus.PENDING,
      batch_id: batchId,
      is_bulk: isBulk,
      remarks: item.remarks ?? null,
      promoted_by: promotedBy,
      created_at: new Date(),
      updated_at: new Date(),
    }));

    const logs = await this.promotionsRepo.bulkCreate(logRecords);

    const results = await Promise.allSettled(
      dto.promotions.map(async (item, idx) => {
        await this.promotionsRepo.updateStudentPromotion(
          item.student_id,
          schoolId,
          dto.to_academic_year_id,
          item.to_class_id,
          item.to_section_id,
          item.to_roll_number,
        );
        await this.promotionsRepo.updateLogStatus(logs[idx].id, PromotionStatus.PROMOTED);
      }),
    );

    let promoted = 0;
    let failed = 0;

    for (let i = 0; i < results.length; i++) {
      if (results[i].status === 'fulfilled') {
        promoted++;
      } else {
        failed++;
        this.logger.error(
          `Promotion failed for student ${dto.promotions[i].student_id}: ${(results[i] as PromiseRejectedResult).reason}`,
        );
        await this.promotionsRepo.updateLogStatus(logs[i].id, PromotionStatus.FAILED);
      }
    }

    await this.redisService.delByPattern(`promotions:${schoolId}:*`);
    return { batchId, promoted, failed, logs };
  }

  async findAll(
    schoolId: string,
    filters: PromotionFilterDto,
  ): Promise<PaginationResponse<PromotionLog>> {
    const key = `promotions:${schoolId}:list:${JSON.stringify(filters)}`;
    return this.redisService.getOrSet(key, CacheTTL.MEDIUM, async () => {
      const [data, total] = await Promise.all([
        this.promotionsRepo.findAll(schoolId, filters),
        this.promotionsRepo.count(schoolId, filters),
      ]);
      return PaginationResponse.of(data, total, filters);
    });
  }
}
