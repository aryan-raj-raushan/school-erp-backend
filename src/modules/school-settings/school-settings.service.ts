import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { SchoolSettingsRepository } from './school-settings.repository';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { DateUtils } from '../../utils/date.utils';
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
    return this.redisService.getOrSet(key, CacheTTL.LONG, () => this.repo.findTimings(schoolId));
  }

  async getTimingById(id: string, schoolId: string): Promise<SchoolTiming> {
    const timing = await this.repo.findTimingById(id, schoolId);
    if (!timing) throw new NotFoundException(`Timing '${id}' not found`);
    return timing;
  }

  async getActiveTimingForDate(schoolId: string, date: string): Promise<SchoolTiming | null> {
    const timings = await this.getTimings(schoolId);
    const match = timings
      .filter((t) => t.is_active && t.effective_from <= date && t.effective_to >= date)
      .sort((a, b) => b.priority - a.priority)[0];
    return match ?? null;
  }

  private async assertValidTiming(
    schoolId: string,
    timing: {
      timing_type: string;
      school_start_time: string;
      school_end_time: string;
      late_cutoff_time?: string | null;
      half_day_cutoff_time?: string | null;
      absent_cutoff_time?: string | null;
      lunch_start_time?: string | null;
      lunch_end_time?: string | null;
      effective_from: string;
      effective_to: string;
    },
    excludeId?: string,
  ): Promise<void> {
    const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : null);
    const start = timing.school_start_time.slice(0, 5);
    const end = timing.school_end_time.slice(0, 5);

    for (const [field, value] of [
      ['effective_from', timing.effective_from],
      ['effective_to', timing.effective_to],
    ]) {
      if (!DateUtils.isCalendarDate(value)) {
        throw new BadRequestException(`${field} '${value}' is not a valid date`);
      }
    }
    if (timing.effective_to < timing.effective_from) {
      throw new BadRequestException('effective_to cannot be before effective_from');
    }
    if (end <= start) {
      throw new BadRequestException('school_end_time must be after school_start_time');
    }

    const cutoffs = [
      ['late_cutoff_time', hhmm(timing.late_cutoff_time)],
      ['half_day_cutoff_time', hhmm(timing.half_day_cutoff_time)],
      ['absent_cutoff_time', hhmm(timing.absent_cutoff_time)],
    ].filter((c): c is [string, string] => c[1] !== null);
    for (const [field, value] of cutoffs) {
      if (value < start || value > end) {
        throw new BadRequestException(`${field} must be within school hours (${start}-${end})`);
      }
    }
    for (let i = 1; i < cutoffs.length; i++) {
      if (cutoffs[i][1] < cutoffs[i - 1][1]) {
        throw new BadRequestException(`${cutoffs[i][0]} cannot be before ${cutoffs[i - 1][0]}`);
      }
    }

    const lunchStart = hhmm(timing.lunch_start_time);
    const lunchEnd = hhmm(timing.lunch_end_time);
    if (!!lunchStart !== !!lunchEnd) {
      throw new BadRequestException('lunch_start_time and lunch_end_time must be set together');
    }
    if (lunchStart && lunchEnd) {
      if (lunchEnd <= lunchStart) {
        throw new BadRequestException('lunch_end_time must be after lunch_start_time');
      }
      if (lunchStart < start || lunchEnd > end) {
        throw new BadRequestException(`Lunch must be within school hours (${start}-${end})`);
      }
    }

    const overlapping = (await this.repo.findTimings(schoolId)).find(
      (t) =>
        t.id !== excludeId &&
        t.is_active &&
        t.timing_type === timing.timing_type &&
        t.effective_from <= timing.effective_to &&
        t.effective_to >= timing.effective_from,
    );
    if (overlapping) {
      throw new ConflictException(
        `Overlaps '${overlapping.name}' (${overlapping.effective_from} to ${overlapping.effective_to}) of the same type`,
      );
    }
  }

  async createTiming(schoolId: string, dto: CreateSchoolTimingDto): Promise<SchoolTiming> {
    await this.assertValidTiming(schoolId, dto);
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
      period_duration_minutes: dto.period_duration_minutes ?? 45,
      lunch_start_time: dto.lunch_start_time ?? null,
      lunch_end_time: dto.lunch_end_time ?? null,
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
    await this.assertValidTiming(schoolId, { ...existing, ...dto }, id);
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
