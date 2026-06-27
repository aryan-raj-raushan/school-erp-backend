import { Injectable, NotFoundException } from '@nestjs/common';
import { ExamHallRepository } from './exam-hall.repository';
import { RedisService } from '../../redis/redis.service';
import { CreateHallDetailDto, UpdateHallDetailDto, FilterHallDetailDto } from './dto/exam-hall.dto';
import { ExamHallDetail } from './types/exam-hall.types';
import { REDIS_EXAM_KEYS } from '@shared/redis/redis-key';
import { PaginationResponse } from '@shared/responses/api-response';
import { generateId } from '@utils/uuid.utils';

@Injectable()
export class ExamHallService {
  constructor(
    private readonly repo: ExamHallRepository,
    private readonly redis: RedisService,
  ) {}

  async findAllDetails(
    schoolId: string,
    filters: FilterHallDetailDto,
  ): Promise<PaginationResponse<ExamHallDetail>> {
    const key = `${REDIS_EXAM_KEYS.HALL_DETAIL.LIST(schoolId, 'all')}:${JSON.stringify(filters)}`;
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
    const rows = Number(dto.grid_rows);
    const cols = Number(dto.grid_cols);
    const gridMode = rows >= 1 && cols >= 1;
    const capacity = gridMode ? rows * cols : (dto.sitting_capacity ?? 0);

    const detail = await this.repo.createDetail({
      id: generateId(),
      school_id: schoolId,
      room_name: dto.room_name,
      sitting_capacity: capacity,
      grid_rows: dto.grid_rows ?? null,
      grid_cols: dto.grid_cols ?? null,
      is_enabled: dto.is_enabled ?? true,
      deleted: false,
      created_by: createdBy,
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
    const rows = dto.grid_rows ? Number(dto.grid_rows) : undefined;
    const cols = dto.grid_cols ? Number(dto.grid_cols) : undefined;
    const gridMode = rows && cols;
    const capacity = gridMode ? rows * cols : dto.sitting_capacity;

    const updated = await this.repo.updateDetail(id, schoolId, {
      room_name: dto.room_name,
      sitting_capacity: capacity,
      grid_rows: dto.grid_rows,
      grid_cols: dto.grid_cols,
      is_enabled: dto.is_enabled,
    });
    await this.redis.delByPattern(REDIS_EXAM_KEYS.HALL_DETAIL.PATTERN(schoolId));
    return updated;
  }

  async removeDetail(id: string, schoolId: string): Promise<void> {
    await this.findDetailById(id, schoolId);
    await this.repo.softDeleteDetail(id, schoolId);
    await this.redis.delByPattern(REDIS_EXAM_KEYS.HALL_DETAIL.PATTERN(schoolId));
  }
}
