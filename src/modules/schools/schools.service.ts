import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { SchoolsRepository } from './schools.repository';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { StringUtils } from '../../utils/string.utils';
import { PaginationResponse } from '../../shared/responses/api-response';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { SchoolFilterDto } from './dto/school-filter.dto';
import { School } from './types/school.types';

const CACHE_TTL = 300;

@Injectable()
export class SchoolsService {
  constructor(
    private readonly schoolsRepo: SchoolsRepository,
    private readonly redisService: RedisService,
  ) {}

  async findAll(filters: SchoolFilterDto): Promise<PaginationResponse<School>> {
    const cacheKey = `schools:list:${JSON.stringify(filters)}`;
    return this.redisService.getOrSet(cacheKey, CACHE_TTL, async () => {
      const [items, total] = await Promise.all([
        this.schoolsRepo.findAll(filters),
        this.schoolsRepo.count(filters),
      ]);
      return PaginationResponse.of(items, total, filters);
    });
  }

  async findById(id: string): Promise<School> {
    const cacheKey = `schools:${id}`;
    return this.redisService.getOrSet(cacheKey, CACHE_TTL, async () => {
      const school = await this.schoolsRepo.findById(id);
      if (!school) throw new NotFoundException(`School with id '${id}' not found`);
      return school;
    });
  }

  async create(dto: CreateSchoolDto, createdBy: string): Promise<School> {
    if (StringUtils.isNotEmpty(dto.code)) {
      const existing = await this.schoolsRepo.findByCode(dto.code!);
      if (existing) throw new ConflictException(`School with code '${dto.code}' already exists`);
    }

    const school = await this.schoolsRepo.create({
      id: generateId(),
      created_by: createdBy,
      ...dto,
    });

    await this.redisService.del('schools:list:*');
    return school;
  }

  async update(id: string, dto: UpdateSchoolDto): Promise<School> {
    await this.findById(id);

    if (StringUtils.isNotEmpty(dto.code)) {
      const existing = await this.schoolsRepo.findByCode(dto.code!);
      if (existing && existing.id !== id) {
        throw new ConflictException(`School code '${dto.code}' already in use`);
      }
    }

    const updated = await this.schoolsRepo.update(id, dto);
    await this.redisService.del(`schools:${id}`);
    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.schoolsRepo.softDelete(id);
    await this.redisService.del(`schools:${id}`);
  }
}
