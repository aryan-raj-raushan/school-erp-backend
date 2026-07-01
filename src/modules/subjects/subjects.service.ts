import { Injectable, NotFoundException } from '@nestjs/common';
import { SubjectsRepository } from './subjects.repository';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { PaginationResponse } from '../../shared/responses/api-response';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { SubjectFilterDto } from './dto/subject-filter.dto';
import { Subject } from './types/subject.types';
import { CacheTTL } from '../../shared/constants';

@Injectable()
export class SubjectsService {
  constructor(
    private readonly subjectsRepo: SubjectsRepository,
    private readonly redisService: RedisService,
  ) {}

  private cacheKey(schoolId: string): string {
    return `subjects:${schoolId}`;
  }

  async findAll(schoolId: string, filters: SubjectFilterDto): Promise<PaginationResponse<Subject>> {
    const key = `${this.cacheKey(schoolId)}:list:${filters.page ?? 1}:${filters.limit ?? 20}:${filters.search ?? ''}`;
    return this.redisService.getOrSet(key, CacheTTL.LONG, async () => {
      const [items, total] = await Promise.all([
        this.subjectsRepo.findAll(schoolId, filters),
        this.subjectsRepo.count(schoolId, filters),
      ]);
      return PaginationResponse.of(items, total, filters);
    });
  }

  async findById(id: string, schoolId: string): Promise<Subject> {
    const key = `subjects:${schoolId}:${id}`;
    return this.redisService.getOrSet(key, CacheTTL.LONG, async () => {
      const subject = await this.subjectsRepo.findById(id, schoolId);
      if (!subject) {
        throw new NotFoundException(`Subject with id '${id}' not found`);
      }
      return subject;
    });
  }

  async create(dto: CreateSubjectDto, schoolId: string, createdBy: string): Promise<Subject> {
    const subject = await this.subjectsRepo.create({
      id: generateId(),
      school_id: schoolId,
      created_by: createdBy,
      ...dto,
      is_elective: dto.is_elective ?? false,
      is_active: dto.is_active ?? true,
    });
    await this.redisService.delByPattern(`subjects:${schoolId}:*`);
    return subject;
  }

  async update(id: string, schoolId: string, dto: UpdateSubjectDto): Promise<Subject> {
    await this.findById(id, schoolId);
    const updated = await this.subjectsRepo.update(id, schoolId, dto);
    await this.redisService.delByPattern(`subjects:${schoolId}:*`);
    return updated;
  }

  async remove(id: string, schoolId: string): Promise<void> {
    await this.findById(id, schoolId);
    await this.subjectsRepo.softDelete(id, schoolId);
    await this.redisService.delByPattern(`subjects:${schoolId}:*`);
  }
}
