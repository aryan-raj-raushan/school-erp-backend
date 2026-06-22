import { Injectable } from '@nestjs/common';
import { ExamAttendanceRepository } from './exam-attendance.repository';
import { RedisService } from '../../redis/redis.service';
import { BulkMarkAttendanceDto, FilterAttendanceDto } from './dto/exam-attendance.dto';
import { ExamAttendance, NewExamAttendance } from './types/exam-attendance.types';
import { PaginationResponse } from '@shared/responses/api-response';
import { REDIS_EXAM_KEYS } from '@shared/redis/redis-key';
import { generateId } from '@utils/uuid.utils';

@Injectable()
export class ExamAttendanceService {
  constructor(
    private readonly repo: ExamAttendanceRepository,
    private readonly redis: RedisService,
  ) {}

  async findAll(
    schoolId: string,
    filters: FilterAttendanceDto,
  ): Promise<PaginationResponse<ExamAttendance>> {
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
}
