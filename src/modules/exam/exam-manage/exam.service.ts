import { Injectable, NotFoundException } from '@nestjs/common';
import { generateId } from '../../../utils/uuid.utils';
import { PaginationResponse } from '../../../shared/responses/api-response';
import { CreateExamDto, UpdateExamDto, FilterExamDto, PublishExamDto } from './dto/exam.dto';
import { Exam } from './types/exam.types';
import { REDIS_EXAM_KEYS } from '@shared/redis/redis-key';
import { RedisService } from '@modules/redis/redis.service';
import { ExamRepository } from './exam.repository';

@Injectable()
export class ExamService {
  constructor(
    private readonly repo: ExamRepository,
    private readonly redis: RedisService,
  ) {}

  async findAll(schoolId: string, filters: FilterExamDto): Promise<PaginationResponse<Exam>> {
    const key = `${REDIS_EXAM_KEYS.EXAM.LIST(schoolId)}:${JSON.stringify(filters)}`;
    return this.redis.getOrSet(key, REDIS_EXAM_KEYS.LIST_TTL, async () => {
      const [items, total] = await Promise.all([
        this.repo.findAll(schoolId, filters),
        this.repo.count(schoolId, filters),
      ]);
      return PaginationResponse.of(items, total, filters);
    });
  }

  async findById(id: string, schoolId: string): Promise<Exam> {
    const key = REDIS_EXAM_KEYS.EXAM.ITEM(schoolId, id);
    return this.redis.getOrSet(key, REDIS_EXAM_KEYS.ITEM_TTL, async () => {
      const exam = await this.repo.findById(id, schoolId);
      if (!exam) throw new NotFoundException(`Exam '${id}' not found`);
      return exam;
    });
  }

  async create(dto: CreateExamDto, schoolId: string, createdBy: string): Promise<Exam> {
    const exam = await this.repo.create({
      id: generateId(),
      school_id: schoolId,
      created_by: createdBy,
      ...dto,
    });
    await this.redis.delByPattern(REDIS_EXAM_KEYS.EXAM.PATTERN(schoolId));
    return exam;
  }

  async update(id: string, schoolId: string, dto: UpdateExamDto): Promise<Exam> {
    await this.findById(id, schoolId);
    const updated = await this.repo.update(id, schoolId, dto);
    await this.redis.delByPattern(REDIS_EXAM_KEYS.EXAM.PATTERN(schoolId));
    return updated;
  }

  async publish(id: string, schoolId: string, dto: PublishExamDto): Promise<Exam> {
    await this.findById(id, schoolId);
    const updated = await this.repo.update(id, schoolId, { is_published: dto.is_published });
    await this.redis.delByPattern(REDIS_EXAM_KEYS.EXAM.PATTERN(schoolId));
    return updated;
  }

  async remove(id: string, schoolId: string): Promise<void> {
    await this.findById(id, schoolId);
    await this.repo.softDelete(id, schoolId);
    await this.redis.delByPattern(REDIS_EXAM_KEYS.EXAM.PATTERN(schoolId));
  }
}
