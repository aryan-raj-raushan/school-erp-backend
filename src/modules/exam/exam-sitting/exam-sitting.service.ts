import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ExamSittingRepository } from './exam-sitting.repository';
import { ExamHallService } from '../exam-hall/exam-hall.service';
import { RedisService } from '../../redis/redis.service';
import {
  CreateSittingPlanBulkDto,
  UpdateSittingPlanDto,
  FilterSittingPlanDto,
} from './dto/exam-sitting.dto';
import { ExamSittingPlan } from './types/exam-sitting.types';
import { REDIS_EXAM_KEYS } from '@shared/redis/redis-key';
import { PaginationResponse } from '@shared/responses/api-response';
import { generateId } from '@utils/uuid.utils';

@Injectable()
export class ExamSittingService {
  constructor(
    private readonly repo: ExamSittingRepository,
    private readonly hallService: ExamHallService,
    private readonly redis: RedisService,
  ) {}

  async findAll(
    schoolId: string,
    filters: FilterSittingPlanDto,
  ): Promise<PaginationResponse<ExamSittingPlan>> {
    const key = `${REDIS_EXAM_KEYS.SITTING.LIST(schoolId, filters.exam_id ?? 'all')}:${JSON.stringify(filters)}`;
    return this.redis.getOrSet(key, REDIS_EXAM_KEYS.LIST_TTL, async () => {
      const [items, total] = await Promise.all([
        this.repo.findAll(schoolId, filters),
        this.repo.count(schoolId, filters),
      ]);
      return PaginationResponse.of(items, total, filters);
    });
  }

  async findById(id: string, schoolId: string): Promise<ExamSittingPlan> {
    const key = REDIS_EXAM_KEYS.SITTING.ITEM(schoolId, id);
    return this.redis.getOrSet(key, REDIS_EXAM_KEYS.ITEM_TTL, async () => {
      const plan = await this.repo.findById(id, schoolId);
      if (!plan) throw new NotFoundException(`Sitting plan entry '${id}' not found`);
      return plan;
    });
  }

  async bulkCreate(
    dto: CreateSittingPlanBulkDto,
    schoolId: string,
    createdBy: string,
  ): Promise<ExamSittingPlan[]> {
    const { exam_id, academic_year_id, entries } = dto;

    const roomCapacityMap = new Map<string, number>();
    const roomOccupiedMap = new Map<string, number>();

    for (const entry of entries) {
      if (!roomCapacityMap.has(entry.hall_detail_id)) {
        const detail = await this.hallService.findDetailById(entry.hall_detail_id, schoolId);
        roomCapacityMap.set(entry.hall_detail_id, detail.sitting_capacity);
        const occupied = await this.repo.countSeatsOccupied(exam_id, entry.hall_detail_id, schoolId);
        roomOccupiedMap.set(entry.hall_detail_id, occupied);
      }

      const existing = await this.repo.findByStudentAndExam(entry.student_id, exam_id, schoolId);
      if (existing) {
        throw new ConflictException(
          `Student '${entry.student_id}' already has a sitting plan for this exam`,
        );
      }

      const capacity = roomCapacityMap.get(entry.hall_detail_id)!;
      const occupied = roomOccupiedMap.get(entry.hall_detail_id)!;
      if (occupied >= capacity) {
        throw new BadRequestException(
          `Room '${entry.hall_detail_id}' has reached its sitting capacity of ${capacity}`,
        );
      }
      roomOccupiedMap.set(entry.hall_detail_id, occupied + 1);
    }

    const rows = entries.map((entry) => ({
      id: generateId(),
      school_id: schoolId,
      academic_year_id,
      exam_id,
      hall_detail_id: entry.hall_detail_id,
      student_id: entry.student_id,
      seat_number: entry.seat_number ?? null,
      roll_number: entry.roll_number ?? null,
      created_by: createdBy,
    }));

    const created = await this.repo.createMany(rows);
    await this.redis.delByPattern(REDIS_EXAM_KEYS.SITTING.PATTERN(schoolId, exam_id));
    return created;
  }

  async update(id: string, schoolId: string, dto: UpdateSittingPlanDto): Promise<ExamSittingPlan> {
    const existing = await this.findById(id, schoolId);

    if (dto.hall_detail_id && dto.hall_detail_id !== existing.hall_detail_id) {
      const detail = await this.hallService.findDetailById(dto.hall_detail_id, schoolId);
      const occupied = await this.repo.countSeatsOccupied(existing.exam_id, dto.hall_detail_id, schoolId);
      if (occupied >= detail.sitting_capacity) {
        throw new BadRequestException(
          `Room '${dto.hall_detail_id}' has reached its sitting capacity of ${detail.sitting_capacity}`,
        );
      }
    }

    const updated = await this.repo.update(id, schoolId, dto);
    await this.redis.delByPattern(REDIS_EXAM_KEYS.SITTING.PATTERN(schoolId, existing.exam_id));
    return updated;
  }

  async remove(id: string, schoolId: string): Promise<void> {
    const existing = await this.findById(id, schoolId);
    await this.repo.softDelete(id, schoolId);
    await this.redis.delByPattern(REDIS_EXAM_KEYS.SITTING.PATTERN(schoolId, existing.exam_id));
  }
}
