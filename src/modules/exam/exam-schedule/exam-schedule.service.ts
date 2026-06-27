import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ExamScheduleRepository } from './exam-schedule.repository';
import { RedisService } from '../../redis/redis.service';
import {
  CreateExamScheduleBulkDto,
  UpdateExamScheduleDto,
  FilterExamScheduleDto,
  CreateExamScheduleItemDto,
  CreateSubScheduleDto,
} from './dto/exam-schedule.dto';
import { ExamSchedule, NewExamSchedule } from './types/exam-schedule.types';
import { generateId } from '@utils/uuid.utils';
import { PaginationResponse } from '@shared/responses/api-response';
import { REDIS_EXAM_KEYS } from '@shared/redis/redis-key';
import { SubjectType } from '@shared/enums/exam.enum';

@Injectable()
export class ExamScheduleService {
  constructor(
    private readonly repo: ExamScheduleRepository,
    private readonly redis: RedisService,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────────────────

  private async validateNoConflict(
    schoolId: string,
    examId: string,
    classId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeId?: string,
  ): Promise<void> {
    const conflicts = await this.repo.findConflict(
      schoolId,
      examId,
      classId,
      date,
      startTime,
      endTime,
      excludeId,
    );
    if (conflicts.length > 0) {
      throw new ConflictException(
        `Time slot conflict on ${date} between ${startTime} and ${endTime} for this exam and class`,
      );
    }
  }

  private async validateNoDuplicate(
    schoolId: string,
    examId: string,
    classId: string,
    subjectId: string,
    excludeId?: string,
  ): Promise<void> {
    const dup = await this.repo.findDuplicate(schoolId, examId, classId, subjectId, excludeId);
    if (dup) {
      throw new ConflictException(
        `Subject '${subjectId}' is already scheduled for this exam and class`,
      );
    }
  }

  private buildScheduleRow(
    item: CreateExamScheduleItemDto | CreateSubScheduleDto,
    schoolId: string,
    academicYearId: string,
    classId: string,
    examId: string,
    createdBy: string,
    parentId?: string,
    subjectId?: string,
    sectionId?: string,
  ): NewExamSchedule {
    const isMain = !parentId;
    const mainItem = item as CreateExamScheduleItemDto;
    return {
      id: generateId(),
      school_id: schoolId,
      academic_year_id: academicYearId,
      class_id: classId,
      section_id: sectionId ?? null,
      exam_id: examId,
      subject_id: subjectId ?? (isMain ? mainItem.subject_id : ''),
      subject_name: item.subject_name,
      subject_type:
        item.subject_type ?? (isMain ? SubjectType.MAIN_EXAM : SubjectType.SECONDARY_EXAM),
      exam_date: item.exam_date,
      start_time: item.start_time,
      end_time: item.end_time,
      exam_marks: item.exam_marks,
      passing_marks: item.passing_marks,
      exam_invigilator_id: item.exam_invigilator_id ?? null,
      hall_detail_id: item.hall_detail_id ?? null,
      sub_subject_enabled: isMain ? (mainItem.sub_subject_enabled ?? false) : false,
      parent_schedule_id: parentId ?? null,
      created_by: createdBy,
    };
  }

  // ── Public API ────────────────────────────────────────────────────────────

  async findAll(
    schoolId: string,
    filters: FilterExamScheduleDto,
  ): Promise<PaginationResponse<ExamSchedule>> {
    const key = `${REDIS_EXAM_KEYS.SCHEDULE.LIST(schoolId, filters.exam_id ?? 'all')}:${JSON.stringify(filters)}`;
    return this.redis.getOrSet(key, REDIS_EXAM_KEYS.LIST_TTL, async () => {
      const [items, total] = await Promise.all([
        this.repo.findAll(schoolId, filters),
        this.repo.count(schoolId, filters),
      ]);
      return PaginationResponse.of(items, total, filters);
    });
  }

  async findById(id: string, schoolId: string): Promise<ExamSchedule> {
    const key = REDIS_EXAM_KEYS.SCHEDULE.ITEM(schoolId, id);
    return this.redis.getOrSet(key, REDIS_EXAM_KEYS.ITEM_TTL, async () => {
      const schedule = await this.repo.findById(id, schoolId);
      if (!schedule) throw new NotFoundException(`Exam schedule '${id}' not found`);
      return schedule;
    });
  }

  async findWithSubSchedules(
    id: string,
    schoolId: string,
  ): Promise<{ schedule: ExamSchedule; subSchedules: ExamSchedule[] }> {
    const schedule = await this.findById(id, schoolId);
    const subSchedules = await this.repo.findByParentId(id, schoolId);
    return { schedule, subSchedules };
  }

  /**
   * Bulk create: receives full schedule for an exam at once.
   * Validates conflicts and duplicates across all items before inserting.
   */
  async bulkCreate(
    dto: CreateExamScheduleBulkDto,
    schoolId: string,
    createdBy: string,
  ): Promise<ExamSchedule[]> {
    const { exam_id, academic_year_id, class_id, section_id, schedules } = dto;

    // Validate each main item
    for (const item of schedules) {
      const itemType = item.subject_type ?? SubjectType.MAIN_EXAM;
      if (itemType === SubjectType.MAIN_EXAM) {
        await this.validateNoDuplicate(schoolId, exam_id, class_id, item.subject_id);
      }
      await this.validateNoConflict(
        schoolId,
        exam_id,
        class_id,
        item.exam_date,
        item.start_time,
        item.end_time,
      );

      // Validate sub-schedules for conflicts too
      if (item.sub_subject_enabled && item.sub_schedules?.length) {
        for (const sub of item.sub_schedules) {
          await this.validateNoConflict(
            schoolId,
            exam_id,
            class_id,
            sub.exam_date,
            sub.start_time,
            sub.end_time,
          );
        }
      }
    }

    const rows: NewExamSchedule[] = [];

    for (const item of schedules) {
      const parentId = generateId();
      rows.push(
        this.buildScheduleRow(
          item,
          schoolId,
          academic_year_id,
          class_id,
          exam_id,
          createdBy,
          undefined,
          item.subject_id,
          section_id,
        ),
      );
      rows[rows.length - 1].id = parentId;

      if (item.sub_subject_enabled && item.sub_schedules?.length) {
        for (const sub of item.sub_schedules) {
          rows.push(
            this.buildScheduleRow(
              sub,
              schoolId,
              academic_year_id,
              class_id,
              exam_id,
              createdBy,
              parentId,
              item.subject_id,
              section_id,
            ),
          );
        }
      }
    }

    const created = await this.repo.createMany(rows);
    await this.redis.delByPattern(REDIS_EXAM_KEYS.SCHEDULE.PATTERN(schoolId));
    return created;
  }

  async update(
    id: string,
    schoolId: string,
    dto: UpdateExamScheduleDto,
    // updatedBy: string,
  ): Promise<ExamSchedule> {
    const existing = await this.findById(id, schoolId);

    if (dto.exam_date || dto.start_time || dto.end_time) {
      await this.validateNoConflict(
        schoolId,
        existing.exam_id,
        existing.class_id,
        dto.exam_date ?? existing.exam_date,
        dto.start_time ?? existing.start_time,
        dto.end_time ?? existing.end_time,
        id,
      );
    }

    if (dto.subject_id && dto.subject_id !== existing.subject_id) {
      await this.validateNoDuplicate(
        schoolId,
        existing.exam_id,
        existing.class_id,
        dto.subject_id,
        id,
      );
    }

    const updated = await this.repo.update(id, schoolId, dto);
    await this.redis.delByPattern(REDIS_EXAM_KEYS.SCHEDULE.PATTERN(schoolId));
    return updated;
  }

  async remove(id: string, schoolId: string): Promise<void> {
    const schedule = await this.findById(id, schoolId);
    await this.repo.hardDelete(id, schoolId);
    await Promise.all([
      this.redis.delByPattern(REDIS_EXAM_KEYS.SCHEDULE.PATTERN(schoolId)),
      this.redis.delByPattern(REDIS_EXAM_KEYS.ATTENDANCE.PATTERN(schoolId, schedule.exam_id)),
    ]);
  }
}
