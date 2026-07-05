import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { ExamScheduleRepository } from './exam-schedule.repository';
import { ExamRepository } from '../exam-manage/exam.repository';
import { RedisService } from '../../redis/redis.service';
import {
  CreateExamScheduleBulkDto,
  CreateExamScheduleMultiClassDto,
  UpdateExamScheduleDto,
  FilterExamScheduleDto,
  CreateExamScheduleItemDto,
  CreateSubScheduleDto,
  BulkLockScheduleDto,
  BulkUpdateScheduleDto,
  BulkDeleteScheduleDto,
} from './dto/exam-schedule.dto';
import { ExamSchedule, NewExamSchedule } from './types/exam-schedule.types';
import { generateId } from '@utils/uuid.utils';
import { PaginationResponse } from '@shared/responses/api-response';
import { REDIS_EXAM_KEYS } from '@shared/redis/redis-key';
import { SubjectType } from '@shared/enums/exam.enum';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';

@Injectable()
export class ExamScheduleService {
  constructor(
    private readonly repo: ExamScheduleRepository,
    private readonly examRepo: ExamRepository,
    private readonly redis: RedisService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────────────────

  /** Rejects a schedule date that falls outside its parent exam's [start_date, end_date] window. */
  private async validateWithinExamWindow(
    schoolId: string,
    examId: string,
    date: string,
  ): Promise<void> {
    const exam = await this.examRepo.findById(examId, schoolId);
    if (!exam) throw new NotFoundException(`Exam '${examId}' not found`);
    if (date < exam.start_date || date > exam.end_date) {
      throw new BadRequestException(
        `Exam date ${date} is outside this exam's window (${exam.start_date} to ${exam.end_date}) — edit the exam's own dates first if you need to schedule outside this range`,
      );
    }
  }

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

  /** Busts the cached attendance-card PDF/data for every affected exam — it embeds subject/date rows that go stale the moment a schedule changes. */
  private async invalidateAttendanceCard(schoolId: string, examIds: string[]): Promise<void> {
    const uniqueExamIds = [...new Set(examIds)];
    await Promise.all(
      uniqueExamIds.map((examId) =>
        this.redis.delByPattern(REDIS_EXAM_KEYS.ATTENDANCE_CARD.EXAM_PATTERN(schoolId, examId)),
      ),
    );
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
      await this.validateWithinExamWindow(schoolId, exam_id, item.exam_date);
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
          await this.validateWithinExamWindow(schoolId, exam_id, sub.exam_date);
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
    await this.invalidateAttendanceCard(schoolId, [exam_id]);
    return created;
  }

  /**
   * Bulk create the same subject list across every given class in one call,
   * instead of the caller looping bulkCreate per class client-side. Each
   * class is still validated (duplicate subject / time-conflict) and
   * inserted independently — a failure partway through leaves earlier
   * classes' rows committed, same as calling bulkCreate per class manually.
   */
  async bulkCreateMultiClass(
    dto: CreateExamScheduleMultiClassDto,
    schoolId: string,
    createdBy: string,
  ): Promise<ExamSchedule[]> {
    const { exam_id, academic_year_id, class_ids, schedules } = dto;
    const allCreated: ExamSchedule[] = [];
    for (const classId of class_ids) {
      const created = await this.bulkCreate(
        { exam_id, academic_year_id, class_id: classId, schedules },
        schoolId,
        createdBy,
      );
      allCreated.push(...created);
    }
    return allCreated;
  }

  async update(
    id: string,
    schoolId: string,
    dto: UpdateExamScheduleDto,
    // updatedBy: string,
  ): Promise<ExamSchedule> {
    const existing = await this.findById(id, schoolId);

    if (dto.exam_date) {
      await this.validateWithinExamWindow(schoolId, existing.exam_id, dto.exam_date);
    }

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
    await this.invalidateAttendanceCard(schoolId, [existing.exam_id]);
    return updated;
  }

  async remove(id: string, schoolId: string): Promise<void> {
    const schedule = await this.findById(id, schoolId);
    await this.repo.hardDelete(id, schoolId);
    await Promise.all([
      this.redis.delByPattern(REDIS_EXAM_KEYS.SCHEDULE.PATTERN(schoolId)),
      this.redis.delByPattern(REDIS_EXAM_KEYS.ATTENDANCE.PATTERN(schoolId, schedule.exam_id)),
      this.invalidateAttendanceCard(schoolId, [schedule.exam_id]),
    ]);
  }

  // ── Bulk operations ────────────────────────────────────────────────────────

  async bulkLock(dto: BulkLockScheduleDto, schoolId: string, userId: string): Promise<void> {
    await this.repo.setLocked(dto.ids, schoolId, dto.locked);
    await this.redis.delByPattern(REDIS_EXAM_KEYS.SCHEDULE.PATTERN(schoolId));
    for (const id of dto.ids) {
      this.auditLogs
        .log({ school_id: schoolId, entity: 'EXAM_SCHEDULE', entity_id: id, action: 'UPDATE', changed_by: userId, new_value: { locked: dto.locked } })
        .catch(() => {});
    }
  }

  /**
   * Applies the same partial fields to every listed (unlocked) row, re-checking
   * the class+room time-overlap conflict for each row individually and
   * reporting failures non-blockingly instead of throwing.
   */
  async bulkUpdate(
    dto: BulkUpdateScheduleDto,
    schoolId: string,
    userId: string,
  ): Promise<{ updated: ExamSchedule[]; conflicts: { id: string; reason: string }[] }> {
    const rows = await this.repo.findByIds(dto.ids, schoolId);
    const conflicts: { id: string; reason: string }[] = [];
    const okIds: string[] = [];
    const examWindowCache = new Map<string, { start_date: string; end_date: string } | null>();

    for (const row of rows) {
      if (row.locked) {
        conflicts.push({ id: row.id, reason: 'LOCKED' });
        continue;
      }
      const date = dto.exam_date ?? row.exam_date;
      const start = dto.start_time ?? row.start_time;
      const end = dto.end_time ?? row.end_time;

      if (dto.exam_date) {
        if (!examWindowCache.has(row.exam_id)) {
          const exam = await this.examRepo.findById(row.exam_id, schoolId);
          examWindowCache.set(
            row.exam_id,
            exam ? { start_date: exam.start_date, end_date: exam.end_date } : null,
          );
        }
        const window = examWindowCache.get(row.exam_id);
        if (!window || date < window.start_date || date > window.end_date) {
          conflicts.push({ id: row.id, reason: 'OUT_OF_EXAM_RANGE' });
          continue;
        }
      }

      if (dto.exam_date || dto.start_time || dto.end_time) {
        const clashes = await this.repo.findConflict(schoolId, row.exam_id, row.class_id, date, start, end, row.id);
        if (clashes.length > 0) {
          conflicts.push({ id: row.id, reason: 'TIME_CLASH' });
          continue;
        }
      }
      okIds.push(row.id);
    }

    const { ids: _ids, ...fields } = dto;
    const updated = await this.repo.bulkUpdate(okIds, schoolId, fields);
    await this.redis.delByPattern(REDIS_EXAM_KEYS.SCHEDULE.PATTERN(schoolId));
    await this.invalidateAttendanceCard(schoolId, rows.map((r) => r.exam_id));
    for (const id of okIds) {
      this.auditLogs
        .log({ school_id: schoolId, entity: 'EXAM_SCHEDULE', entity_id: id, action: 'UPDATE', changed_by: userId, new_value: fields })
        .catch(() => {});
    }
    return { updated, conflicts };
  }

  async bulkRemove(dto: BulkDeleteScheduleDto, schoolId: string, userId: string): Promise<void> {
    const rows = await this.repo.findByIds(dto.ids, schoolId);
    await this.repo.bulkHardDelete(dto.ids, schoolId);
    await this.redis.delByPattern(REDIS_EXAM_KEYS.SCHEDULE.PATTERN(schoolId));
    await this.invalidateAttendanceCard(schoolId, rows.map((r) => r.exam_id));
    for (const id of dto.ids) {
      this.auditLogs
        .log({ school_id: schoolId, entity: 'EXAM_SCHEDULE', entity_id: id, action: 'DELETE', changed_by: userId })
        .catch(() => {});
    }
  }
}
