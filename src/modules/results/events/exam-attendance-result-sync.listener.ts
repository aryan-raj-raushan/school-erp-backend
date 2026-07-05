import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ExamResultsRepository } from '../exam-results.repository';
import { ExamScheduleRepository } from '@modules/exam/exam-schedule/exam-schedule.repository';
import { RedisService } from '@modules/redis/redis.service';
import { APP_EVENTS } from '@shared/events/event-names';
import { ExamAttendanceSyncEvent } from '@modules/exam/exam-attendance/events/exam-attendance.events';
import { NewExamResult } from '../types/exam-result.types';
import { generateId } from '@utils/uuid.utils';

/**
 * Keeps marks entry mapped to exam attendance: a student marked absent for a
 * schedule can't have marks entered for it, and correcting attendance back to
 * present re-opens that cell. See [[event_orchestrator]].
 */
@Injectable()
export class ExamAttendanceResultSyncListener {
  private readonly logger = new Logger(ExamAttendanceResultSyncListener.name);

  constructor(
    private readonly resultsRepo: ExamResultsRepository,
    private readonly scheduleRepo: ExamScheduleRepository,
    private readonly redis: RedisService,
  ) {}

  @OnEvent(APP_EVENTS.EXAM_ATTENDANCE.ABSENT_MARKED)
  async handleAbsentMarked(event: ExamAttendanceSyncEvent): Promise<void> {
    const scheduleIds = [...new Set(event.entries.map((e) => e.scheduleId))];
    const schedules = await this.scheduleRepo.findByIds(scheduleIds, event.schoolId);
    const scheduleMap = new Map(schedules.map((s) => [s.id, s]));

    const rows: NewExamResult[] = [];
    for (const entry of event.entries) {
      const schedule = scheduleMap.get(entry.scheduleId);
      if (!schedule) {
        this.logger.warn(`Schedule '${entry.scheduleId}' not found — skipping absent sync`);
        continue;
      }
      rows.push({
        id: generateId(),
        school_id: event.schoolId,
        academic_year_id: event.academicYearId,
        exam_id: event.examId,
        exam_schedule_id: entry.scheduleId,
        class_id: schedule.class_id,
        section_id: schedule.section_id,
        student_id: entry.studentId,
        subject_id: schedule.subject_id,
        marks_obtained: null,
        max_marks: schedule.exam_marks,
        is_absent: true,
        created_by: event.markedBy,
        updated_by: event.markedBy,
      });
    }
    if (rows.length === 0) return;

    await this.resultsRepo.upsertBulk(rows);
    await this.redis.delByPattern(`exam:result:${event.schoolId}:*`);
  }

  @OnEvent(APP_EVENTS.EXAM_ATTENDANCE.PRESENT_MARKED)
  async handlePresentMarked(event: ExamAttendanceSyncEvent): Promise<void> {
    await this.resultsRepo.clearAbsentFlag(
      event.entries.map((e) => ({ studentId: e.studentId, scheduleId: e.scheduleId })),
      event.schoolId,
    );
    await this.redis.delByPattern(`exam:result:${event.schoolId}:*`);
  }
}
