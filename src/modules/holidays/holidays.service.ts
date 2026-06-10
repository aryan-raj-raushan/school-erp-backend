import { Injectable, NotFoundException } from '@nestjs/common';
import { HolidaysRepository } from './holidays.repository';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { PaginationResponse } from '../../shared/responses/api-response';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';
import { FilterHolidayDto } from './dto/filter-holiday.dto';
import { Holiday } from './types/holiday.types';
import { CacheTTL } from '../../shared/constants';

@Injectable()
export class HolidaysService {
  constructor(
    private readonly holidaysRepo: HolidaysRepository,
    private readonly redisService: RedisService,
  ) {}

  private cacheKey(schoolId: string): string {
    return `holidays:${schoolId}`;
  }

  async findAll(schoolId: string, filters: FilterHolidayDto): Promise<PaginationResponse<Holiday>> {
    const { page = 1, limit = 20, ...rest } = filters;
    const key = `${this.cacheKey(schoolId)}:list:${JSON.stringify({ ...rest, page, limit })}`;

    return this.redisService.getOrSet(key, CacheTTL.LONG, async () => {
      const [items, total] = await Promise.all([
        this.holidaysRepo.findAll(schoolId, rest, page, limit),
        this.holidaysRepo.count(schoolId, rest),
      ]);
      return PaginationResponse.of(items, total, { page, limit });
    });
  }

  async findById(id: string, schoolId: string): Promise<Holiday> {
    const key = `${this.cacheKey(schoolId)}:${id}`;
    return this.redisService.getOrSet(key, CacheTTL.LONG, async () => {
      const holiday = await this.holidaysRepo.findById(id, schoolId);
      if (!holiday) {
        throw new NotFoundException(`Holiday with id '${id}' not found`);
      }
      return holiday;
    });
  }

  async create(dto: CreateHolidayDto, schoolId: string, createdBy: string): Promise<Holiday> {
    const holiday = await this.holidaysRepo.create({
      id: generateId(),
      school_id: schoolId,
      created_by: createdBy,
      ...dto,
    });
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return holiday;
  }

  async update(id: string, schoolId: string, dto: UpdateHolidayDto): Promise<Holiday> {
    await this.findById(id, schoolId);
    const updated = await this.holidaysRepo.update(id, schoolId, dto);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return updated;
  }

  async remove(id: string, schoolId: string): Promise<void> {
    await this.findById(id, schoolId);
    await this.holidaysRepo.softDelete(id, schoolId);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
  }
}
