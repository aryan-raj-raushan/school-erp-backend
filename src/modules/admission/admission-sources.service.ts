import { Injectable, NotFoundException } from '@nestjs/common';
import { AdmissionSourcesRepository } from './admission-sources.repository';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { PaginationResponse } from '../../shared/responses/api-response';
import { CreateAdmissionSourceDto } from './dto/create-admission-source.dto';
import { UpdateAdmissionSourceDto } from './dto/update-admission-source.dto';
import { FilterAdmissionSourceDto } from './dto/filter-admission-source.dto';
import { AdmissionSource } from './types/admission-source.types';

const LIST_TTL = 120;
const ITEM_TTL = 300;

@Injectable()
export class AdmissionSourcesService {
  constructor(
    private readonly sourcesRepo: AdmissionSourcesRepository,
    private readonly redisService: RedisService,
  ) {}

  private cacheKey(schoolId: string) {
    return `admission_sources:${schoolId}`;
  }

  async findAll(schoolId: string, filters: FilterAdmissionSourceDto): Promise<PaginationResponse<AdmissionSource>> {
    const key = `${this.cacheKey(schoolId)}:list:${JSON.stringify(filters)}`;
    return this.redisService.getOrSet(key, LIST_TTL, async () => {
      const [items, total] = await Promise.all([
        this.sourcesRepo.findAll(schoolId, filters),
        this.sourcesRepo.count(schoolId, filters),
      ]);
      return PaginationResponse.of(items, total, filters);
    });
  }

  async findById(id: string, schoolId: string): Promise<AdmissionSource> {
    const key = `${this.cacheKey(schoolId)}:${id}`;
    return this.redisService.getOrSet(key, ITEM_TTL, async () => {
      const source = await this.sourcesRepo.findById(id, schoolId);
      if (!source) throw new NotFoundException(`Admission source with id '${id}' not found`);
      return source;
    });
  }

  async create(dto: CreateAdmissionSourceDto, schoolId: string, createdBy: string): Promise<AdmissionSource> {
    const source = await this.sourcesRepo.create({
      id: generateId(),
      school_id: schoolId,
      created_by: createdBy,
      ...dto,
    });
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:list:*`);
    return source;
  }

  async update(id: string, schoolId: string, dto: UpdateAdmissionSourceDto): Promise<AdmissionSource> {
    await this.findById(id, schoolId);
    const updated = await this.sourcesRepo.update(id, schoolId, dto);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return updated;
  }

  async remove(id: string, schoolId: string): Promise<void> {
    await this.findById(id, schoolId);
    await this.sourcesRepo.softDelete(id, schoolId);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
  }
}