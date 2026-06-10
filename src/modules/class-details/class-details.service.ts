import { Injectable, NotFoundException } from '@nestjs/common';
import { ClassDetailsRepository } from './class-details.repository';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { PaginationResponse } from '../../shared/responses/api-response';
import { CreateClassDetailDto } from './dto/create-class-detail.dto';
import { UpdateClassDetailDto } from './dto/update-class-detail.dto';
import { FilterClassDetailDto } from './dto/filter-class-detail.dto';
import { ClassDetail } from './types/class-detail.types';
import { CacheTTL } from '../../shared/constants';

@Injectable()
export class ClassDetailsService {
  constructor(
    private readonly classDetailsRepo: ClassDetailsRepository,
    private readonly redisService: RedisService,
  ) {}

  private cacheKey(schoolId: string): string {
    return `class_details:${schoolId}`;
  }

  async findAll(
    schoolId: string,
    filters: FilterClassDetailDto,
  ): Promise<PaginationResponse<ClassDetail>> {
    const key = `${this.cacheKey(schoolId)}:list:${JSON.stringify(filters)}`;
    return this.redisService.getOrSet(key, CacheTTL.LONG, async () => {
      const [items, total] = await Promise.all([
        this.classDetailsRepo.findAll(schoolId, filters),
        this.classDetailsRepo.count(schoolId, filters),
      ]);
      return PaginationResponse.of(items, total, filters);
    });
  }

  async findById(id: string, schoolId: string): Promise<ClassDetail> {
    const key = `${this.cacheKey(schoolId)}:${id}`;
    return this.redisService.getOrSet(key, CacheTTL.LONG, async () => {
      const detail = await this.classDetailsRepo.findById(id, schoolId);
      if (!detail) throw new NotFoundException(`Class detail with id '${id}' not found`);
      return detail;
    });
  }

  async create(
    dto: CreateClassDetailDto,
    schoolId: string,
    createdBy: string,
  ): Promise<ClassDetail> {
    const detail = await this.classDetailsRepo.create({
      id: generateId(),
      school_id: schoolId,
      created_by: createdBy,
      ...dto,
      is_enabled: dto.is_enabled ?? true,
    });
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return detail;
  }

  async update(id: string, schoolId: string, dto: UpdateClassDetailDto): Promise<ClassDetail> {
    await this.findById(id, schoolId);
    const updated = await this.classDetailsRepo.update(id, schoolId, dto);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return updated;
  }

  async remove(id: string, schoolId: string): Promise<void> {
    await this.findById(id, schoolId);
    await this.classDetailsRepo.softDelete(id, schoolId);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
  }
}
