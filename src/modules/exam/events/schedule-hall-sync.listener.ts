import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ExamScheduleRepository } from '../exam-schedule/exam-schedule.repository';
import { ExamSittingRepository } from '../exam-sitting/exam-sitting.repository';
import { RedisService } from '@modules/redis/redis.service';
import { REDIS_EXAM_KEYS } from '@shared/redis/redis-key';
import { APP_EVENTS } from '@shared/events/event-names';
import { SittingPlanRoomsAssignedEvent } from './exam.events';

/**
 * After sitting-plan seats are written, sync exam_schedules.hall_detail_id to
 * the room each class ended up mostly in (majority room, if split across more
 * than one) — this is only a convenience summary for the schedule list/page;
 * the master print sheet reads the real per-room breakdown from
 * exam_sitting_plans directly (see ExamSittingService.getMasterPdfData), so a
 * class split across rooms is never lost from the PDF just because this
 * summary can only hold one room per class.
 */
@Injectable()
export class ScheduleHallSyncListener {
  constructor(
    private readonly sittingRepo: ExamSittingRepository,
    private readonly scheduleRepo: ExamScheduleRepository,
    private readonly redis: RedisService,
  ) {}

  @OnEvent(APP_EVENTS.SITTING_PLAN.ROOMS_ASSIGNED)
  async handleRoomsAssigned({ examId, schoolId }: SittingPlanRoomsAssignedEvent): Promise<void> {
    const counts = await this.sittingRepo.countSeatsByRoomAndClassId(examId, schoolId);
    const bestRoomByClass = new Map<string, { hall_detail_id: string; count: number }>();
    for (const row of counts) {
      const current = bestRoomByClass.get(row.class_id);
      if (!current || row.count > current.count) {
        bestRoomByClass.set(row.class_id, { hall_detail_id: row.hall_detail_id, count: row.count });
      }
    }
    await Promise.all(
      [...bestRoomByClass.entries()].map(([classId, room]) =>
        this.scheduleRepo.setHallForClass(examId, classId, schoolId, room.hall_detail_id),
      ),
    );
    if (bestRoomByClass.size > 0) {
      await this.redis.delByPattern(REDIS_EXAM_KEYS.SCHEDULE.PATTERN(schoolId));
    }
  }
}
