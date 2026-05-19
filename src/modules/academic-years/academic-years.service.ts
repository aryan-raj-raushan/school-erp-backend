import { Injectable, NotFoundException } from '@nestjs/common';
import { AcademicYearsRepository } from './academic-years.repository';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { PaginationResponse } from '../../shared/responses/api-response';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';
import { UpdateAcademicYearDto } from './dto/update-academic-year.dto';
import { AcademicYear } from './types/academic-year.types';

const CACHE_TTL = 300;

@Injectable()
export class AcademicYearsService {
  constructor(
    private readonly academicYearsRepo: AcademicYearsRepository,
    private readonly redisService: RedisService,
  ) {}

  private cacheKey(schoolId: string): string {
    return `academic_years:${schoolId}`;
  }

  async findAll(
    schoolId: string,
    page: number,
    limit: number,
  ): Promise<PaginationResponse<AcademicYear>> {
    const key = `${this.cacheKey(schoolId)}:list:${page}:${limit}`;
    return this.redisService.getOrSet(key, CACHE_TTL, async () => {
      const [items, total] = await Promise.all([
        this.academicYearsRepo.findAll(schoolId, page, limit),
        this.academicYearsRepo.count(schoolId),
      ]);
      return PaginationResponse.of(items, total, { page, limit });
    });
  }

  async findById(id: string, schoolId: string): Promise<AcademicYear> {
    const key = `${this.cacheKey(schoolId)}:${id}`;
    return this.redisService.getOrSet(key, CACHE_TTL, async () => {
      const academicYear = await this.academicYearsRepo.findById(id, schoolId);
      if (!academicYear) {
        throw new NotFoundException(`Academic year with id '${id}' not found`);
      }
      return academicYear;
    });
  }

  async findCurrent(schoolId: string): Promise<AcademicYear> {
    const key = `${this.cacheKey(schoolId)}:current`;
    return this.redisService.getOrSet(key, CACHE_TTL, async () => {
      const academicYear = await this.academicYearsRepo.findCurrent(schoolId);
      if (!academicYear) {
        throw new NotFoundException(`No current academic year set for this school`);
      }
      return academicYear;
    });
  }

  async create(
    dto: CreateAcademicYearDto,
    schoolId: string,
    createdBy: string,
  ): Promise<AcademicYear> {
    const academicYear = await this.academicYearsRepo.create({
      id: generateId(),
      school_id: schoolId,
      created_by: createdBy,
      ...dto,
      is_current: dto.is_current ?? false,
    });
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return academicYear;
  }

  async update(
    id: string,
    schoolId: string,
    dto: UpdateAcademicYearDto,
  ): Promise<AcademicYear> {
    await this.findById(id, schoolId);
    const updated = await this.academicYearsRepo.update(id, schoolId, dto);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return updated;
  }

  async setCurrent(id: string, schoolId: string): Promise<AcademicYear> {
    await this.findById(id, schoolId);
    const updated = await this.academicYearsRepo.setCurrent(id, schoolId);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return updated;
  }
}
