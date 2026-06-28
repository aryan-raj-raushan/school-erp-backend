import { Injectable, NotFoundException } from '@nestjs/common';
import { SchoolSettingsRepository } from './school-settings.repository';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { CacheTTL } from '../../shared/constants';
import {
  UpdateSchoolSettingsDto,
  CreateSchoolTimingDto,
  UpdateSchoolTimingDto,
  SetClassTimingDto,
} from './dto/school-settings.dto';
import { SchoolSettings, SchoolTiming, ClassTimingOverride } from './types/school-settings.types';

@Injectable()
export class SchoolSettingsService {
  constructor(
    private readonly repo: SchoolSettingsRepository,
    private readonly redisService: RedisService,
  ) {}

  private settingsKey(schoolId: string) {
    return `school-settings:${schoolId}`;
  }

  private timingsKey(schoolId: string) {
    return `school-timings:${schoolId}`;
  }

  // ─── School Settings ─────────────────────────────────────────────────────────

  async getSettings(schoolId: string): Promise<SchoolSettings> {
    const key = this.settingsKey(schoolId);
    return this.redisService.getOrSet(key, CacheTTL.LONG, async () => {
      const existing = await this.repo.findSettings(schoolId);
      if (existing) return existing;
      return this.repo.upsertSettings(schoolId, generateId(), {});
    });
  }

  async updateSettings(schoolId: string, dto: UpdateSchoolSettingsDto): Promise<SchoolSettings> {
    const updated = await this.repo.upsertSettings(schoolId, generateId(), dto);
    await this.redisService.del(this.settingsKey(schoolId));
    return updated;
  }

  // ─── School Timings ───────────────────────────────────────────────────────────

  async getTimings(schoolId: string): Promise<SchoolTiming[]> {
    const key = this.timingsKey(schoolId);
    return this.redisService.getOrSet(key, CacheTTL.LONG, () =>
      this.repo.findTimings(schoolId),
    );
  }

  async getActiveTimingForDate(schoolId: string, date: string): Promise<SchoolTiming | null> {
    const timings = await this.getTimings(schoolId);
    const match = timings
      .filter((t) => t.is_active && t.effective_from <= date && t.effective_to >= date)
      .sort((a, b) => b.priority - a.priority)[0];
    return match ?? null;
  }

  async createTiming(schoolId: string, dto: CreateSchoolTimingDto): Promise<SchoolTiming> {
    const timing = await this.repo.createTiming({
      id: generateId(),
      school_id: schoolId,
      name: dto.name,
      timing_type: dto.timing_type,
      school_start_time: dto.school_start_time,
      school_end_time: dto.school_end_time,
      grace_period_minutes: dto.grace_period_minutes ?? 10,
      late_cutoff_time: dto.late_cutoff_time ?? null,
      half_day_cutoff_time: dto.half_day_cutoff_time ?? null,
      absent_cutoff_time: dto.absent_cutoff_time ?? null,
      working_days: dto.working_days ?? 'MON,TUE,WED,THU,FRI',
      effective_from: dto.effective_from,
      effective_to: dto.effective_to,
      priority: dto.priority ?? 0,
      is_active: true,
      deleted: false,
    });
    await this.redisService.del(this.timingsKey(schoolId));
    return timing;
  }

  async updateTiming(
    id: string,
    schoolId: string,
    dto: UpdateSchoolTimingDto,
  ): Promise<SchoolTiming> {
    const existing = await this.repo.findTimingById(id, schoolId);
    if (!existing) throw new NotFoundException(`Timing '${id}' not found`);
    const updated = await this.repo.updateTiming(id, schoolId, dto);
    await this.redisService.del(this.timingsKey(schoolId));
    return updated;
  }

  async deleteTiming(id: string, schoolId: string): Promise<void> {
    const existing = await this.repo.findTimingById(id, schoolId);
    if (!existing) throw new NotFoundException(`Timing '${id}' not found`);
    await this.repo.softDeleteTiming(id, schoolId);
    await this.redisService.del(this.timingsKey(schoolId));
  }

  // ─── Class Timing Overrides ───────────────────────────────────────────────────

  async getClassOverrides(schoolId: string): Promise<ClassTimingOverride[]> {
    return this.repo.findClassOverrides(schoolId);
  }

  async setClassTiming(
    classId: string,
    schoolId: string,
    dto: SetClassTimingDto,
  ): Promise<ClassTimingOverride> {
    return this.repo.upsertClassOverride(generateId(), classId, schoolId, dto.timing_id ?? null);
  }
}
