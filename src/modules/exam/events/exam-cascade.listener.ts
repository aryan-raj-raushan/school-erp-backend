import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ExamScheduleRepository } from '../exam-schedule/exam-schedule.repository';
import { ExamAttendanceRepository } from '../exam-attendance/exam-attendance.repository';
import { ExamSittingRepository } from '../exam-sitting/exam-sitting.repository';
import { RedisService } from '@modules/redis/redis.service';
import { REDIS_EXAM_KEYS } from '@shared/redis/redis-key';
import { APP_EVENTS } from '@shared/events/event-names';
import { ExamDeletedEvent } from './exam.events';

/**
 * Deleting an exam must not leave orphaned schedule/attendance/sitting-plan
 * rows behind. Hard-deletes them (the exam row itself stays soft-deleted so
 * ExamService.restore() still works — only its downstream data is gone).
 */
@Injectable()
export class ExamCascadeListener {
  constructor(
    private readonly scheduleRepo: ExamScheduleRepository,
    private readonly attendanceRepo: ExamAttendanceRepository,
    private readonly sittingRepo: ExamSittingRepository,
    private readonly redis: RedisService,
  ) {}

  @OnEvent(APP_EVENTS.EXAM.DELETED)
  async handleExamDeleted({ examId, schoolId }: ExamDeletedEvent): Promise<void> {
    await Promise.all([
      this.scheduleRepo.hardDeleteByExam(examId, schoolId),
      this.attendanceRepo.hardDeleteByExam(examId, schoolId),
      this.sittingRepo.hardDeleteByExam(examId, schoolId),
    ]);
    await Promise.all([
      this.redis.delByPattern(REDIS_EXAM_KEYS.SCHEDULE.PATTERN(schoolId)),
      this.redis.delByPattern(REDIS_EXAM_KEYS.ATTENDANCE.SCHOOL_PATTERN(schoolId)),
      this.redis.delByPattern(REDIS_EXAM_KEYS.SITTING.SCHOOL_PATTERN(schoolId)),
    ]);
  }
}
