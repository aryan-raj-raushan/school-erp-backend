import { Injectable, NotFoundException } from '@nestjs/common';
import { SchoolEventsRepository } from './school-events.repository';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { PaginationResponse } from '../../shared/responses/api-response';
import { CreateSchoolEventDto } from './dto/create-school-event.dto';
import { UpdateSchoolEventDto } from './dto/update-school-event.dto';
import { SchoolEventFilterDto } from './dto/school-event-filter.dto';
import { SchoolEvent } from './types/school-event.types';

const LIST_TTL = 120;
const ITEM_TTL = 300;

@Injectable()
export class SchoolEventsService {
  constructor(
    private readonly schoolEventsRepo: SchoolEventsRepository,
    private readonly redisService: RedisService,
  ) {}

  private cacheKey(schoolId: string): string {
    return `school_events:${schoolId}`;
  }

  async findAll(
    schoolId: string,
    filters: SchoolEventFilterDto,
  ): Promise<PaginationResponse<SchoolEvent>> {
    const key = `${this.cacheKey(schoolId)}:list:${JSON.stringify(filters)}`;
    return this.redisService.getOrSet(key, LIST_TTL, async () => {
      const [items, total] = await Promise.all([
        this.schoolEventsRepo.findAll(schoolId, filters),
        this.schoolEventsRepo.count(schoolId, filters),
      ]);
      return PaginationResponse.of(items, total, filters);
    });
  }

  async findById(id: string, schoolId: string): Promise<SchoolEvent> {
    const key = `${this.cacheKey(schoolId)}:${id}`;
    return this.redisService.getOrSet(key, ITEM_TTL, async () => {
      const event = await this.schoolEventsRepo.findById(id, schoolId);
      if (!event) throw new NotFoundException(`School event with id '${id}' not found`);
      return event;
    });
  }

  async create(
    dto: CreateSchoolEventDto,
    schoolId: string,
    createdBy: string,
  ): Promise<SchoolEvent> {
    const event = await this.schoolEventsRepo.create({
      id: generateId(),
      school_id: schoolId,
      created_by: createdBy,
      ...dto,
    });
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:list:*`);
    return event;
  }

  async update(
    id: string,
    schoolId: string,
    dto: UpdateSchoolEventDto,
  ): Promise<SchoolEvent> {
    await this.findById(id, schoolId);
    const updated = await this.schoolEventsRepo.update(id, schoolId, dto);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return updated;
  }

  async remove(id: string, schoolId: string): Promise<void> {
    await this.findById(id, schoolId);
    await this.schoolEventsRepo.softDelete(id, schoolId);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
  }
}