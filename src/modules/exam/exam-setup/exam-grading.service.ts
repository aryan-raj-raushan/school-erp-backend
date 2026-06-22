import { Injectable, NotFoundException } from '@nestjs/common';
import { ExamGradingRepository } from './exam-grading.repository';
import { RedisService } from '../../redis/redis.service';
import { CreateExamGradingDto, UpdateExamGradingDto } from './dto/exam-grading.dto';
import { ExamGrading } from './types/exam-grading.types';
import { REDIS_EXAM_KEYS } from '@shared/redis/redis-key';
import { generateId } from '@utils/uuid.utils';

@Injectable()
export class ExamGradingService {
  constructor(
    private readonly repo: ExamGradingRepository,
    private readonly redis: RedisService,
  ) {}

  async findAll(schoolId: string): Promise<ExamGrading[]> {
    const key = REDIS_EXAM_KEYS.GRADING.LIST(schoolId);
    return this.redis.getOrSet(key, REDIS_EXAM_KEYS.ITEM_TTL, () => this.repo.findAll(schoolId));
  }

  async findById(id: string, schoolId: string): Promise<ExamGrading> {
    const key = REDIS_EXAM_KEYS.GRADING.ITEM(schoolId, id);
    return this.redis.getOrSet(key, REDIS_EXAM_KEYS.ITEM_TTL, async () => {
      const grading = await this.repo.findById(id, schoolId);
      if (!grading) throw new NotFoundException(`Exam grading '${id}' not found`);
      return grading;
    });
  }

  async create(
    dto: CreateExamGradingDto,
    schoolId: string,
    createdBy: string,
  ): Promise<ExamGrading> {
    const grading = await this.repo.create({
      id: generateId(),
      school_id: schoolId,
      created_by: createdBy,
      ...dto,
    });
    await this.redis.del(REDIS_EXAM_KEYS.GRADING.LIST(schoolId));
    return grading;
  }

  async update(id: string, schoolId: string, dto: UpdateExamGradingDto): Promise<ExamGrading> {
    await this.findById(id, schoolId);
    const updated = await this.repo.update(id, schoolId, dto);
    await this.redis.del(REDIS_EXAM_KEYS.GRADING.LIST(schoolId));
    await this.redis.del(REDIS_EXAM_KEYS.GRADING.ITEM(schoolId, id));
    return updated;
  }

  async remove(id: string, schoolId: string): Promise<void> {
    await this.findById(id, schoolId);
    await this.repo.softDelete(id, schoolId);
    await this.redis.del(REDIS_EXAM_KEYS.GRADING.LIST(schoolId));
    await this.redis.del(REDIS_EXAM_KEYS.GRADING.ITEM(schoolId, id));
  }
}
