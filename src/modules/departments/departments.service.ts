import { Injectable, NotFoundException } from '@nestjs/common';
import { DepartmentsRepository } from './departments.repository';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { PaginationResponse } from '../../shared/responses/api-response';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { FilterDepartmentDto } from './dto/filter-department.dto';
import { Department } from './types/department.types';
import { CacheTTL } from '../../shared/constants';

@Injectable()
export class DepartmentsService {
  constructor(
    private readonly departmentsRepo: DepartmentsRepository,
    private readonly redisService: RedisService,
  ) {}

  private cacheKey(schoolId: string): string {
    return `departments:${schoolId}`;
  }

  async findAll(
    schoolId: string,
    filters: FilterDepartmentDto,
  ): Promise<PaginationResponse<Department>> {
    const key = `${this.cacheKey(schoolId)}:list:${JSON.stringify(filters)}`;
    return this.redisService.getOrSet(key, CacheTTL.LONG, async () => {
      const [items, total] = await Promise.all([
        this.departmentsRepo.findAll(schoolId, filters),
        this.departmentsRepo.count(schoolId, filters),
      ]);
      return PaginationResponse.of(items, total, filters);
    });
  }

  async findById(id: string, schoolId: string): Promise<Department> {
    const key = `${this.cacheKey(schoolId)}:${id}`;
    return this.redisService.getOrSet(key, CacheTTL.LONG, async () => {
      const dept = await this.departmentsRepo.findById(id, schoolId);
      if (!dept) throw new NotFoundException(`Department with id '${id}' not found`);
      return dept;
    });
  }

  async create(dto: CreateDepartmentDto, schoolId: string, createdBy: string): Promise<Department> {
    const dept = await this.departmentsRepo.create({
      id: generateId(),
      school_id: schoolId,
      created_by: createdBy,
      ...dto,
      is_active: dto.is_active ?? true,
    });
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return dept;
  }

  async update(id: string, schoolId: string, dto: UpdateDepartmentDto): Promise<Department> {
    await this.findById(id, schoolId);
    const updated = await this.departmentsRepo.update(id, schoolId, dto);
    if (!updated) throw new NotFoundException(`Department with id '${id}' not found`);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return updated;
  }

  async remove(id: string, schoolId: string): Promise<void> {
    await this.findById(id, schoolId);
    await this.departmentsRepo.softDelete(id, schoolId);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
  }
}
