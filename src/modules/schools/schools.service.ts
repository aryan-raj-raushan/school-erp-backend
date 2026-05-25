import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { SchoolsRepository } from './schools.repository';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { StringUtils } from '../../utils/string.utils';
import { PaginationResponse } from '../../shared/responses/api-response';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { SchoolFilterDto } from './dto/school-filter.dto';
import { School } from './types/school.types';
import { CompanyRole } from '../../shared/enums';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { companyUserSchools } from '../../database/drizzle/schema';

const CACHE_TTL = 300;
const SCHOOLS_TTL = 3600;

@Injectable()
export class SchoolsService {
  constructor(
    private readonly schoolsRepo: SchoolsRepository,
    private readonly redisService: RedisService,
    @Inject(DRIZZLE_ORM) private readonly db: DrizzleDB,
  ) {}

  // BUG-003/004/005: returns null for SUPER_ADMIN (= all access), array for others
  private async getPermittedSchoolIds(userId: string, role: string): Promise<string[] | null> {
    if (role === CompanyRole.SUPER_ADMIN) return null;

    const key = `company_user:${userId}:schools`;
    let ids = await this.redisService.smembers(key);

    if (ids.length === 0) {
      const rows = await this.db
        .select({ school_id: companyUserSchools.school_id })
        .from(companyUserSchools)
        .where(eq(companyUserSchools.user_id, userId));
      ids = rows.map((r) => r.school_id);
      if (ids.length > 0) {
        await this.redisService.sadd(key, ...ids);
        await this.redisService.expire(key, SCHOOLS_TTL);
      }
    }

    return ids;
  }

  private async assertSchoolAccess(schoolId: string, userId: string, role: string): Promise<void> {
    const permitted = await this.getPermittedSchoolIds(userId, role);
    if (permitted !== null && !permitted.includes(schoolId)) {
      throw new ForbiddenException('Access denied to this school');
    }
  }

  async findAll(filters: SchoolFilterDto, userId: string, role: string): Promise<PaginationResponse<School>> {
    const allowedIds = await this.getPermittedSchoolIds(userId, role);
    const cacheKey = `schools:list:${userId}:${JSON.stringify(filters)}`;
    return this.redisService.getOrSet(cacheKey, CACHE_TTL, async () => {
      const [items, total] = await Promise.all([
        this.schoolsRepo.findAll(filters, allowedIds ?? undefined),
        this.schoolsRepo.count(filters, allowedIds ?? undefined),
      ]);
      return PaginationResponse.of(items, total, filters);
    });
  }

  async findById(id: string, userId: string, role: string): Promise<School> {
    await this.assertSchoolAccess(id, userId, role);
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

    await this.redisService.delByPattern(`schools:list:*`);
    return school;
  }

  async update(id: string, dto: UpdateSchoolDto, userId: string, role: string): Promise<School> {
    await this.assertSchoolAccess(id, userId, role);
    await this.findById(id, userId, role);

    if (StringUtils.isNotEmpty(dto.code)) {
      const existing = await this.schoolsRepo.findByCode(dto.code!);
      if (existing && existing.id !== id) {
        throw new ConflictException(`School code '${dto.code}' already in use`);
      }
    }

    const updated = await this.schoolsRepo.update(id, dto);
    await this.redisService.del(`schools:${id}`);
    await this.redisService.delByPattern(`schools:list:*`);
    return updated;
  }

  async remove(id: string, userId: string, role: string): Promise<void> {
    await this.assertSchoolAccess(id, userId, role);
    await this.findById(id, userId, role);
    await this.schoolsRepo.softDelete(id);
    await this.redisService.del(`schools:${id}`);
    await this.redisService.delByPattern(`schools:list:*`);
  }
}
