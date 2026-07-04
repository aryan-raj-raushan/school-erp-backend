import { Injectable, BadRequestException } from '@nestjs/common';
import { ExamAttendanceRepository } from './exam-attendance.repository';
import { ExamScheduleRepository } from '../exam-schedule/exam-schedule.repository';
import { RedisService } from '../../redis/redis.service';
import { BulkMarkAttendanceDto, FilterAttendanceDto } from './dto/exam-attendance.dto';
import { ExamAttendance, NewExamAttendance } from './types/exam-attendance.types';
import { EnrichedExamAttendance } from './exam-attendance.repository';
import { PaginationResponse } from '@shared/responses/api-response';
import { REDIS_EXAM_KEYS } from '@shared/redis/redis-key';
import { generateId } from '@utils/uuid.utils';

@Injectable()
export class ExamAttendanceService {
  constructor(
    private readonly repo: ExamAttendanceRepository,
    private readonly scheduleRepo: ExamScheduleRepository,
    private readonly redis: RedisService,
  ) {}

  async findAll(
    schoolId: string,
    filters: FilterAttendanceDto,
  ): Promise<PaginationResponse<EnrichedExamAttendance>> {
    const key = `${REDIS_EXAM_KEYS.ATTENDANCE.LIST(schoolId, filters.exam_id ?? 'all', filters.schedule_id ?? 'all')}:${JSON.stringify(filters)}`;
    return this.redis.getOrSet(key, REDIS_EXAM_KEYS.LIST_TTL, async () => {
      const [items, total] = await Promise.all([
        this.repo.findAll(schoolId, filters),
        this.repo.count(schoolId, filters),
      ]);
      return PaginationResponse.of(items, total, filters);
    });
  }

  async findBySchedule(scheduleId: string, schoolId: string): Promise<ExamAttendance[]> {
    const key = REDIS_EXAM_KEYS.ATTENDANCE.LIST(schoolId, 'any', scheduleId);
    return this.redis.getOrSet(key, REDIS_EXAM_KEYS.ITEM_TTL, () =>
      this.repo.findBySchedule(scheduleId, schoolId),
    );
  }

  /**
   * Bulk upsert: one call marks all students across all schedule entries.
   * Existing records are updated (status/remarks), new ones inserted.
   */
  async bulkMark(
    dto: BulkMarkAttendanceDto,
    schoolId: string,
    markedBy: string,
  ): Promise<ExamAttendance[]> {
    await this.assertEntriesMatchStudentClass(dto, schoolId);

    const rows: NewExamAttendance[] = dto.entries.map((entry) => ({
      id: generateId(),
      school_id: schoolId,
      academic_year_id: dto.academic_year_id,
      exam_id: dto.exam_id,
      schedule_id: entry.schedule_id,
      student_id: entry.student_id,
      status: entry.status,
      remarks: entry.remarks ?? null,
      marked_by: markedBy,
    }));

    const result = await this.repo.upsertMany(rows);
    await this.redis.delByPattern(REDIS_EXAM_KEYS.ATTENDANCE.PATTERN(schoolId, dto.exam_id));
    return result;
  }

  /**
   * Defense-in-depth: rejects any entry whose student isn't actually in the
   * class that schedule_id belongs to. Catches this bug class regardless of
   * what the client sends (the frontend can leak cross-class schedule rows
   * if it forgets to filter by class_id when fetching schedules).
   */
  private async assertEntriesMatchStudentClass(
    dto: BulkMarkAttendanceDto,
    schoolId: string,
  ): Promise<void> {
    const scheduleIds = [...new Set(dto.entries.map((e) => e.schedule_id))];
    const studentIds = [...new Set(dto.entries.map((e) => e.student_id))];

    const [schedules, studentClassMap] = await Promise.all([
      this.scheduleRepo.findByIds(scheduleIds, schoolId),
      this.repo.findStudentClassMap(studentIds, dto.academic_year_id, schoolId),
    ]);
    const scheduleClassMap = new Map(schedules.map((s) => [s.id, s.class_id]));

    const mismatches = dto.entries.filter((entry) => {
      const scheduleClassId = scheduleClassMap.get(entry.schedule_id);
      const studentClassId = studentClassMap.get(entry.student_id);
      return !scheduleClassId || !studentClassId || scheduleClassId !== studentClassId;
    });

    if (mismatches.length > 0) {
      throw new BadRequestException(
        `${mismatches.length} attendance entr${mismatches.length === 1 ? 'y belongs' : 'ies belong'} to a student whose class doesn't match the schedule's class — refresh and try again`,
      );
    }
  }
}
