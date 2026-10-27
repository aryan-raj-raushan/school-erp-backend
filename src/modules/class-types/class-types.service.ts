import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ClassTypesRepository } from './class-types.repository';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { PaginationResponse } from '../../shared/responses/api-response';
import { CreateClassTypeDto } from './dto/create-class-type.dto';
import { UpdateClassTypeDto } from './dto/update-class-type.dto';
import { FilterClassTypeDto } from './dto/filter-class-type.dto';
import { ClassType } from './types/class-type.types';
import { CacheTTL } from '../../shared/constants';

@Injectable()
export class ClassTypesService {
  constructor(
    private readonly classTypesRepo: ClassTypesRepository,
    private readonly redisService: RedisService,
  ) {}

  private cacheKey(schoolId: string): string {
    return `class_types:${schoolId}`;
  }

  async findAll(
    schoolId: string,
    filters: FilterClassTypeDto,
  ): Promise<PaginationResponse<ClassType>> {
    const key = `${this.cacheKey(schoolId)}:list:${JSON.stringify(filters)}`;
    return this.redisService.getOrSet(key, CacheTTL.LONG, async () => {
      const [items, total] = await Promise.all([
        this.classTypesRepo.findAll(schoolId, filters),
        this.classTypesRepo.count(schoolId, filters),
      ]);
      return PaginationResponse.of(items, total, filters);
    });
  }

  async findById(id: string, schoolId: string): Promise<ClassType> {
    const key = `${this.cacheKey(schoolId)}:${id}`;
    return this.redisService.getOrSet(key, CacheTTL.LONG, async () => {
      const ct = await this.classTypesRepo.findById(id, schoolId);
      if (!ct) throw new NotFoundException(`Class type with id '${id}' not found`);
      return ct;
    });
  }

  private async assertNameAvailable(schoolId: string, name: string, excludeId?: string) {
    const existing = await this.classTypesRepo.findByName(schoolId, name);
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`Class type '${existing.name}' already exists`);
    }
  }

  async create(dto: CreateClassTypeDto, schoolId: string, createdBy: string): Promise<ClassType> {
    await this.assertNameAvailable(schoolId, dto.name);
    const ct = await this.classTypesRepo.create({
      id: generateId(),
      school_id: schoolId,
      created_by: createdBy,
      ...dto,
      is_active: dto.is_active ?? true,
    });
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return ct;
  }

  async update(id: string, schoolId: string, dto: UpdateClassTypeDto): Promise<ClassType> {
    const existing = await this.findById(id, schoolId);
    if (dto.name) await this.assertNameAvailable(schoolId, dto.name, id);
    const updated = await this.classTypesRepo.update(id, schoolId, dto);
    if (!updated) throw new NotFoundException(`Class type with id '${id}' not found`);
    if (dto.name && dto.name !== existing.name) {
      await this.classTypesRepo.renameInClasses(schoolId, existing.name, dto.name);
      await this.redisService.delByPattern(`classes:${schoolId}:*`);
    }
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return updated;
  }

  async remove(id: string, schoolId: string): Promise<void> {
    const existing = await this.findById(id, schoolId);
    const inUse = await this.classTypesRepo.countClassesUsing(schoolId, existing.name);
    if (inUse > 0) {
      throw new ConflictException(
        `Class type '${existing.name}' is used by ${inUse} class(es) — change those classes first`,
      );
    }
    await this.classTypesRepo.softDelete(id, schoolId);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
  }
}
