import { Injectable, NotFoundException } from '@nestjs/common';
import { ClassesRepository } from './classes.repository';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { PaginationResponse } from '../../shared/responses/api-response';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { ClassFilterDto } from './dto/class-filter.dto';
import { Class, ClassSectionView } from './types/class.types';
import { CacheTTL } from '../../shared/constants';

@Injectable()
export class ClassesService {
  constructor(
    private readonly classesRepo: ClassesRepository,
    private readonly redisService: RedisService,
  ) {}

  private cacheKey(schoolId: string, academicYearId?: string): string {
    return `classes:${schoolId}:${academicYearId ?? 'all'}`;
  }

  async findAll(
    schoolId: string,
    filters: ClassFilterDto,
  ): Promise<PaginationResponse<ClassSectionView>> {
    const key = `${this.cacheKey(schoolId, filters.academic_year_id)}:list:${filters.page ?? 1}:${filters.limit ?? 20}`;
    return this.redisService.getOrSet(key, CacheTTL.LONG, async () => {
      const [items, total] = await Promise.all([
        this.classesRepo.findAll(schoolId, filters),
        this.classesRepo.count(schoolId, filters),
      ]);
      return PaginationResponse.of(items, total, filters);
    });
  }

  async findById(id: string, schoolId: string): Promise<Class> {
    const key = `classes:${schoolId}:${id}`;
    return this.redisService.getOrSet(key, CacheTTL.LONG, async () => {
      const cls = await this.classesRepo.findById(id, schoolId);
      if (!cls) throw new NotFoundException(`Class with id '${id}' not found`);
      return cls;
    });
  }

  async create(dto: CreateClassDto, schoolId: string, createdBy: string): Promise<Class> {
    const cls = await this.classesRepo.create({
      id: generateId(),
      school_id: schoolId,
      created_by: createdBy,
      ...dto,
    });
    await this.redisService.delByPattern(`classes:${schoolId}:*`);
    return cls;
  }

  async update(id: string, schoolId: string, dto: UpdateClassDto): Promise<Class> {
    const updated = await this.classesRepo.update(id, schoolId, dto);
    if (!updated) throw new NotFoundException(`Class with id '${id}' not found`);
    await this.redisService.delByPattern(`classes:${schoolId}:*`);
    return updated;
  }

  async remove(id: string, schoolId: string): Promise<void> {
    // id is class UUID (frontend passes class_id directly after normalization)
    await this.classesRepo.softDelete(id, schoolId);
    await this.redisService.delByPattern(`classes:${schoolId}:*`);
  }
}
