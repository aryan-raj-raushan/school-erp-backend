import { Injectable, NotFoundException } from '@nestjs/common';
import { ClassSubjectsRepository } from './class-subjects.repository';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { PaginationResponse } from '../../shared/responses/api-response';
import { CreateClassSubjectDto } from './dto/create-class-subject.dto';
import { ClassSubjectFilterDto } from './dto/class-subject-filter.dto';
import { ClassSectionSubject } from './types/class-subject.types';

const CACHE_TTL = 120;

@Injectable()
export class ClassSubjectsService {
  constructor(
    private readonly repo: ClassSubjectsRepository,
    private readonly redisService: RedisService,
  ) {}

  private cacheKey(schoolId: string) {
    return `class_subjects:${schoolId}`;
  }

  async findAll(schoolId: string, filters: ClassSubjectFilterDto): Promise<PaginationResponse<any>> {
    const key = `${this.cacheKey(schoolId)}:list:${JSON.stringify(filters)}`;
    return this.redisService.getOrSet(key, CACHE_TTL, async () => {
      const [items, total] = await Promise.all([
        this.repo.findAll(schoolId, filters),
        this.repo.count(schoolId, filters),
      ]);
      return PaginationResponse.of(items, total, filters);
    });
  }

  async findById(id: string, schoolId: string): Promise<ClassSectionSubject> {
    const record = await this.repo.findById(id, schoolId);
    if (!record) throw new NotFoundException(`Class subject assignment with id '${id}' not found`);
    return record;
  }

  async create(dto: CreateClassSubjectDto, schoolId: string, createdBy: string): Promise<ClassSectionSubject> {
    const record = await this.repo.create({ id: generateId(), school_id: schoolId, created_by: createdBy, ...dto });
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return record;
  }

  async update(id: string, schoolId: string, dto: Partial<CreateClassSubjectDto>): Promise<ClassSectionSubject> {
    await this.findById(id, schoolId);
    const updated = await this.repo.update(id, schoolId, dto);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return updated;
  }

  async remove(id: string, schoolId: string): Promise<void> {
    await this.findById(id, schoolId);
    await this.repo.softDelete(id, schoolId);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
  }
}
