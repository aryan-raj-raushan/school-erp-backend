import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TimetableRepository } from './timetable.repository';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { CreateTimetableDto, PeriodTimeDto, TimetableEntryDto } from './dto/create-timetable.dto';
import { AutoGenerateTimetableDto } from './dto/auto-generate-timetable.dto';
import {
  TimetableFull,
  NewTimetableEntry,
  AutoGenerateResult,
  AutoGenerateConflict,
} from './types/timetable.types';
import { CacheTTL } from '../../shared/constants';
import { SchoolSettingsService } from '../school-settings/school-settings.service';
import { ClassSubjectTeacherService } from '../class-subject-teacher/class-subject-teacher.service';

const DAY_CODE_TO_ENUM: Record<string, string> = {
  MON: 'MONDAY',
  TUE: 'TUESDAY',
  WED: 'WEDNESDAY',
  THU: 'THURSDAY',
  FRI: 'FRIDAY',
  SAT: 'SATURDAY',
  SUN: 'SUNDAY',
};

@Injectable()
export class TimetableService {
  constructor(
    private readonly repo: TimetableRepository,
    private readonly redisService: RedisService,
    private readonly schoolSettingsService: SchoolSettingsService,
    private readonly classSubjectTeacherService: ClassSubjectTeacherService,
  ) {}

  async findAll(schoolId: string, filters: { academic_year_id?: string; class_id?: string }) {
    const key = `timetable:${schoolId}:list:${JSON.stringify(filters)}`;
    return this.redisService.getOrSet(key, CacheTTL.LONG, () =>
      this.repo.findAll(schoolId, filters),
    );
  }

  async findById(id: string, schoolId: string): Promise<TimetableFull> {
    const key = `timetable:${schoolId}:${id}`;
    return this.redisService.getOrSet(key, CacheTTL.LONG, async () => {
      const timetable = await this.repo.findById(id, schoolId);
      if (!timetable) throw new NotFoundException(`Timetable '${id}' not found`);
      const [period_times, entries, class_teacher] = await Promise.all([
        this.repo.findPeriodTimes(id),
        this.repo.findEntries(id),
        this.repo.findClassTeacher(id),
      ]);
      return { timetable, period_times, entries, class_teacher };
    });
  }

  async create(dto: CreateTimetableDto, schoolId: string): Promise<TimetableFull> {
    const id = generateId();
    const timetable = await this.repo.create({
      id,
      school_id: schoolId,
      academic_year_id: dto.academic_year_id,
      class_id: dto.class_id,
      name: dto.name ?? 'DEFAULT',
      max_periods: dto.max_periods ?? 8,
      is_complete: dto.is_complete ?? false,
    });

    const period_times = dto.period_times?.length
      ? await this.repo.replacePeriodTimes(
          id,
          dto.period_times.map((p) => ({ id: generateId(), timetable_id: id, ...p })),
        )
      : [];

    const entries = dto.entries?.length
      ? await this.repo.replaceEntries(
          id,
          schoolId,
          dto.entries.map((e) => ({
            timetable_id: id,
            day_of_week: e.day_of_week as NewTimetableEntry['day_of_week'],
            period_number: e.period_number,
            subject_id: e.subject_id,
            teacher_id: e.teacher_id,
          })),
        )
      : [];

    let class_teacher = null;
    if (dto.class_teacher_id) {
      await this.repo.setClassTeacher(id, schoolId, dto.class_teacher_id);
      class_teacher = await this.repo.findClassTeacher(id);
    }

    await this.redisService.delByPattern(`timetable:${schoolId}:*`);
    return { timetable, period_times, entries, class_teacher };
  }

  async update(
    id: string,
    schoolId: string,
    dto: Partial<CreateTimetableDto>,
  ): Promise<TimetableFull> {
    await this.repo.findById(id, schoolId).then((t) => {
      if (!t) throw new NotFoundException(`Timetable '${id}' not found`);
    });

    const timetable = await this.repo.update(id, schoolId, {
      academic_year_id: dto.academic_year_id,
      class_id: dto.class_id,
      name: dto.name,
      max_periods: dto.max_periods,
      is_complete: dto.is_complete,
    });

    const period_times =
      dto.period_times !== undefined
        ? await this.repo.replacePeriodTimes(
            id,
            dto.period_times.map((p) => ({ id: generateId(), timetable_id: id, ...p })),
          )
        : await this.repo.findPeriodTimes(id);

    const entries =
      dto.entries !== undefined
        ? await this.repo.replaceEntries(
            id,
            schoolId,
            dto.entries.map((e) => ({
              timetable_id: id,
              day_of_week: e.day_of_week as NewTimetableEntry['day_of_week'],
              period_number: e.period_number,
              subject_id: e.subject_id,
              teacher_id: e.teacher_id,
            })),
          )
        : await this.repo.findEntries(id);

    if (dto.class_teacher_id !== undefined) {
      if (dto.class_teacher_id) {
        await this.repo.setClassTeacher(id, schoolId, dto.class_teacher_id);
      } else {
        await this.repo.clearClassTeacher(id);
      }
    }
    const class_teacher = await this.repo.findClassTeacher(id);

    await this.redisService.delByPattern(`timetable:${schoolId}:*`);
    return { timetable, period_times, entries, class_teacher };
  }

  async remove(id: string, schoolId: string): Promise<void> {
    await this.repo.findById(id, schoolId).then((t) => {
      if (!t) throw new NotFoundException(`Timetable '${id}' not found`);
    });
    await this.repo.softDelete(id, schoolId);
    await this.redisService.delByPattern(`timetable:${schoolId}:*`);
  }

  async getEmployeeTimetable(schoolId: string, teacherId: string) {
    const key = `timetable:${schoolId}:teacher:${teacherId}`;
    return this.redisService.getOrSet(key, CacheTTL.LONG, () =>
      this.repo.findEntriesByTeacher(schoolId, teacherId),
    );
  }

  async getSessionView(
    schoolId: string,
    filters: { day: string; academic_year_id?: string; class_id?: string; timetable_name?: string },
  ) {
    const key = `timetable:${schoolId}:session:${JSON.stringify(filters)}`;
    return this.redisService.getOrSet(key, CacheTTL.LONG, () =>
      this.repo.findSessionView(schoolId, filters),
    );
  }

  async autoGenerate(dto: AutoGenerateTimetableDto, schoolId: string): Promise<AutoGenerateResult> {
    const timing = await this.schoolSettingsService.getTimingById(dto.school_timing_id, schoolId);
    const mappings = await this.classSubjectTeacherService.findForClass(
      schoolId,
      dto.academic_year_id,
      dto.class_id,
    );
    if (mappings.length === 0) {
      throw new BadRequestException(
        'No subject-teacher mapping found for this class. Set it up on the Subject-Teacher Map page first.',
      );
    }
    if (dto.lunch_after_period !== undefined && dto.lunch_after_period >= mappings.length) {
      throw new BadRequestException(
        'lunch_after_period must be less than the number of mapped subjects',
      );
    }

    const slots = this.buildPeriodSlots(
      timing,
      mappings.length,
      dto.lunch_after_period,
      dto.lunch_duration_minutes,
    );
    const teachingSlots = slots.filter((s) => !s.is_break);
    const workingDays = (timing.working_days ?? '')
      .split(',')
      .map((c) => DAY_CODE_TO_ENUM[c.trim()])
      .filter((d): d is string => Boolean(d));

    const teacherIds = [...new Set(mappings.map((m) => m.teacher_id))];
    const busySlots = await this.repo.findTeacherBusySlots(
      schoolId,
      dto.academic_year_id,
      teacherIds,
    );
    const busyByTeacherDay = new Map<string, { start: number; end: number }[]>();
    for (const b of busySlots) {
      const key = `${b.teacher_id}|${b.day_of_week}`;
      const list = busyByTeacherDay.get(key) ?? [];
      list.push({ start: this.timeToMinutes(b.start_time), end: this.timeToMinutes(b.end_time) });
      busyByTeacherDay.set(key, list);
    }

    const entries: TimetableEntryDto[] = [];
    const conflicts: AutoGenerateConflict[] = [];

    workingDays.forEach((day, dayIndex) => {
      teachingSlots.forEach((slot, slotIndex) => {
        const mapping = mappings[(dayIndex + slotIndex) % mappings.length];
        const key = `${mapping.teacher_id}|${day}`;
        const slotStart = this.timeToMinutes(slot.start_time);
        const slotEnd = this.timeToMinutes(slot.end_time);
        const busyRanges = busyByTeacherDay.get(key) ?? [];
        const isClash = busyRanges.some((r) => slotStart < r.end && slotEnd > r.start);

        if (isClash) {
          conflicts.push({
            day_of_week: day,
            period_number: slot.period_number,
            subject_name: mapping.subject_name,
            teacher_name: mapping.teacher_name,
          });
          return;
        }

        entries.push({
          day_of_week: day,
          period_number: slot.period_number,
          subject_id: mapping.subject_id,
          teacher_id: mapping.teacher_id,
        });
        busyRanges.push({ start: slotStart, end: slotEnd });
        busyByTeacherDay.set(key, busyRanges);
      });
    });

    const timetable = await this.create(
      {
        name: dto.name ?? 'DEFAULT',
        academic_year_id: dto.academic_year_id,
        class_id: dto.class_id,
        max_periods: slots.length,
        period_times: slots,
        entries,
      },
      schoolId,
    );

    return { timetable, conflicts };
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  private minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60)
      .toString()
      .padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  /**
   * Slices the school day into exactly `subjectCount` equal-length teaching periods
   * (period length is derived from the window, not a fixed setting) so every mapped
   * subject gets exactly one period per day, plus one optional lunch break.
   */
  private buildPeriodSlots(
    timing: { school_start_time: string; school_end_time: string },
    subjectCount: number,
    lunchAfterPeriod?: number,
    lunchDurationMinutes?: number,
  ): PeriodTimeDto[] {
    const start = this.timeToMinutes(timing.school_start_time);
    const end = this.timeToMinutes(timing.school_end_time);
    const totalMinutes = end - start;
    const lunchMinutes = lunchAfterPeriod && lunchDurationMinutes ? lunchDurationMinutes : 0;
    const teachingMinutes = totalMinutes - lunchMinutes;

    if (teachingMinutes <= 0) {
      throw new BadRequestException('The lunch break does not fit within the school day window');
    }

    const periodDuration = teachingMinutes / subjectCount;
    const slots: PeriodTimeDto[] = [];
    let cursor = start;
    let periodNumber = 1;

    for (let i = 0; i < subjectCount; i++) {
      if (lunchAfterPeriod && lunchMinutes > 0 && i === lunchAfterPeriod) {
        const lunchEnd = cursor + lunchMinutes;
        slots.push({
          period_number: periodNumber++,
          start_time: this.minutesToTime(cursor),
          end_time: this.minutesToTime(lunchEnd),
          is_break: true,
        });
        cursor = lunchEnd;
      }

      const periodEnd = i === subjectCount - 1 ? end : Math.round(cursor + periodDuration);
      slots.push({
        period_number: periodNumber++,
        start_time: this.minutesToTime(cursor),
        end_time: this.minutesToTime(periodEnd),
        is_break: false,
      });
      cursor = periodEnd;
    }

    return slots;
  }
}
