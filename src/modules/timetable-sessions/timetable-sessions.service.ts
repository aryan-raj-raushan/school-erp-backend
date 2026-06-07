import { Injectable, NotFoundException } from '@nestjs/common';
import { TimetableSessionsRepository } from './timetable-sessions.repository';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { PaginationResponse } from '../../shared/responses/api-response';
import { CreateTimetableSessionDto } from './dto/create-timetable-session.dto';
import { UpdateTimetableSessionDto } from './dto/update-timetable-session.dto';
import { FilterTimetableSessionDto } from './dto/filter-timetable-session.dto';
import { TimetableSession } from './types/timetable-session.types';

const CACHE_TTL = 300;

@Injectable()
export class TimetableSessionsService {
  constructor(
    private readonly timetableSessionsRepo: TimetableSessionsRepository,
    private readonly redisService: RedisService,
  ) {}

  private cacheKey(schoolId: string): string {
    return `timetable_sessions:${schoolId}`;
  }

  async findAll(
    schoolId: string,
    filters: FilterTimetableSessionDto,
  ): Promise<PaginationResponse<TimetableSession>> {
    const { page = 1, limit = 20, ...rest } = filters;
    const key = `${this.cacheKey(schoolId)}:list:${JSON.stringify({ ...rest, page, limit })}`;
    return this.redisService.getOrSet(key, CACHE_TTL, async () => {
      const [items, total] = await Promise.all([
        this.timetableSessionsRepo.findAll(schoolId, rest, page, limit),
        this.timetableSessionsRepo.count(schoolId, rest),
      ]);
      return PaginationResponse.of(items, total, { page, limit });
    });
  }

  async findById(id: string, schoolId: string): Promise<TimetableSession> {
    const key = `${this.cacheKey(schoolId)}:${id}`;
    return this.redisService.getOrSet(key, CACHE_TTL, async () => {
      const session = await this.timetableSessionsRepo.findById(id, schoolId);
      if (!session) {
        throw new NotFoundException(`Timetable session with id '${id}' not found`);
      }
      return session;
    });
  }

  async findActiveSession(schoolId: string): Promise<TimetableSession> {
    const key = `${this.cacheKey(schoolId)}:active`;
    return this.redisService.getOrSet(key, CACHE_TTL, async () => {
      const session = await this.timetableSessionsRepo.findActiveSession(schoolId);
      if (!session) {
        throw new NotFoundException(`No active timetable session found for this school`);
      }
      return session;
    });
  }

  async create(
    dto: CreateTimetableSessionDto,
    schoolId: string,
    createdBy: string,
  ): Promise<TimetableSession> {
    const session = await this.timetableSessionsRepo.create({
      id: generateId(),
      school_id: schoolId,
      created_by: createdBy,
      ...dto,
      is_enabled: dto.is_enabled ?? true,
      is_active_session: dto.is_active_session ?? false,
    });
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return session;
  }

  async update(
    id: string,
    schoolId: string,
    dto: UpdateTimetableSessionDto,
  ): Promise<TimetableSession> {
    await this.findById(id, schoolId);
    const updated = await this.timetableSessionsRepo.update(id, schoolId, dto);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return updated;
  }

  async setActive(id: string, schoolId: string): Promise<TimetableSession> {
    await this.findById(id, schoolId);
    await this.timetableSessionsRepo.clearActiveSession(schoolId);
    const updated = await this.timetableSessionsRepo.update(id, schoolId, { is_active_session: true });
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return updated;
  }

  async remove(id: string, schoolId: string): Promise<void> {
    await this.findById(id, schoolId);
    await this.timetableSessionsRepo.softDelete(id, schoolId);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
  }
}
