import { Injectable, NotFoundException } from '@nestjs/common';
import { ExamHallRepository } from './exam-hall.repository';
import { RedisService } from '../../redis/redis.service';
import {
  CreateHallPlanDto,
  UpdateHallPlanDto,
  FilterHallPlanDto,
  CreateHallDetailDto,
  UpdateHallDetailDto,
  FilterHallDetailDto,
} from './dto/exam-hall.dto';
import { ExamHallPlan, ExamHallDetail } from './types/exam-hall.types';
import { REDIS_EXAM_KEYS } from '@shared/redis/redis-key';
import { PaginationResponse } from '@shared/responses/api-response';
import { generateId } from '@utils/uuid.utils';

@Injectable()
export class ExamHallService {
  constructor(
    private readonly repo: ExamHallRepository,
    private readonly redis: RedisService,
  ) {}

  // ── Hall Plans ────────────────────────────────────────────────────────────

  async findAllPlans(
    schoolId: string,
    filters: FilterHallPlanDto,
  ): Promise<PaginationResponse<ExamHallPlan>> {
    const key = `${REDIS_EXAM_KEYS.HALL_PLAN.LIST(schoolId)}:${JSON.stringify(filters)}`;
    return this.redis.getOrSet(key, REDIS_EXAM_KEYS.LIST_TTL, async () => {
      const [items, total] = await Promise.all([
        this.repo.findAllPlans(schoolId, filters),
        this.repo.countPlans(schoolId, filters),
      ]);
      return PaginationResponse.of(items, total, filters);
    });
  }

  async findPlanById(id: string, schoolId: string): Promise<ExamHallPlan> {
    const key = REDIS_EXAM_KEYS.HALL_PLAN.ITEM(schoolId, id);
    return this.redis.getOrSet(key, REDIS_EXAM_KEYS.ITEM_TTL, async () => {
      const plan = await this.repo.findPlanById(id, schoolId);
      if (!plan) throw new NotFoundException(`Hall plan '${id}' not found`);
      return plan;
    });
  }

  async createPlan(
    dto: CreateHallPlanDto,
    schoolId: string,
    createdBy: string,
  ): Promise<ExamHallPlan> {
    const plan = await this.repo.createPlan({
      id: generateId(),
      school_id: schoolId,
      created_by: createdBy,
      ...dto,
    });
    await this.redis.delByPattern(REDIS_EXAM_KEYS.HALL_PLAN.PATTERN(schoolId));
    return plan;
  }

  async updatePlan(id: string, schoolId: string, dto: UpdateHallPlanDto): Promise<ExamHallPlan> {
    await this.findPlanById(id, schoolId);
    const updated = await this.repo.updatePlan(id, schoolId, dto);
    await this.redis.delByPattern(REDIS_EXAM_KEYS.HALL_PLAN.PATTERN(schoolId));
    return updated;
  }

  async removePlan(id: string, schoolId: string): Promise<void> {
    await this.findPlanById(id, schoolId);
    await this.repo.softDeletePlan(id, schoolId);
    await this.redis.delByPattern(REDIS_EXAM_KEYS.HALL_PLAN.PATTERN(schoolId));
  }

  // ── Hall Details ──────────────────────────────────────────────────────────

  async findAllDetails(
    schoolId: string,
    filters: FilterHallDetailDto,
  ): Promise<PaginationResponse<ExamHallDetail>> {
    const key = `${REDIS_EXAM_KEYS.HALL_DETAIL.LIST(schoolId, filters.hall_plan_id ?? 'all')}:${JSON.stringify(filters)}`;
    return this.redis.getOrSet(key, REDIS_EXAM_KEYS.LIST_TTL, async () => {
      const [items, total] = await Promise.all([
        this.repo.findAllDetails(schoolId, filters),
        this.repo.countDetails(schoolId, filters),
      ]);
      return PaginationResponse.of(items, total, filters);
    });
  }

  async findDetailById(id: string, schoolId: string): Promise<ExamHallDetail> {
    const key = REDIS_EXAM_KEYS.HALL_DETAIL.ITEM(schoolId, id);
    return this.redis.getOrSet(key, REDIS_EXAM_KEYS.ITEM_TTL, async () => {
      const detail = await this.repo.findDetailById(id, schoolId);
      if (!detail) throw new NotFoundException(`Hall detail '${id}' not found`);
      return detail;
    });
  }

  async createDetail(
    dto: CreateHallDetailDto,
    schoolId: string,
    createdBy: string,
  ): Promise<ExamHallDetail> {
    // Verify plan exists
    await this.findPlanById(dto.hall_plan_id, schoolId);
    const detail = await this.repo.createDetail({
      id: generateId(),
      school_id: schoolId,
      created_by: createdBy,
      ...dto,
    });
    await this.redis.delByPattern(REDIS_EXAM_KEYS.HALL_DETAIL.PATTERN(schoolId));
    return detail;
  }

  async updateDetail(
    id: string,
    schoolId: string,
    dto: UpdateHallDetailDto,
  ): Promise<ExamHallDetail> {
    await this.findDetailById(id, schoolId);
    const updated = await this.repo.updateDetail(id, schoolId, dto);
    await this.redis.delByPattern(REDIS_EXAM_KEYS.HALL_DETAIL.PATTERN(schoolId));
    return updated;
  }

  async removeDetail(id: string, schoolId: string): Promise<void> {
    await this.findDetailById(id, schoolId);
    await this.repo.softDeleteDetail(id, schoolId);
    await this.redis.delByPattern(REDIS_EXAM_KEYS.HALL_DETAIL.PATTERN(schoolId));
  }
}
