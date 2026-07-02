import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ExamSittingRepository } from './exam-sitting.repository';
import { ExamHallService } from '../exam-hall/exam-hall.service';
import { ExamService } from '../exam-manage/exam.service';
import { ExamScheduleRepository } from '../exam-schedule/exam-schedule.repository';
import { RedisService } from '../../redis/redis.service';
import {
  CreateSittingPlanBulkDto,
  UpdateSittingPlanDto,
  FilterSittingPlanDto,
  AutoShuffleSittingPlanDto,
  RoomPdfQueryDto,
} from './dto/exam-sitting.dto';
import { ExamSittingPlan } from './types/exam-sitting.types';
import type { RoomStudentRow, StudentForShuffle } from './exam-sitting.repository';
import { REDIS_EXAM_KEYS } from '@shared/redis/redis-key';
import { PaginationResponse } from '@shared/responses/api-response';
import { generateId } from '@utils/uuid.utils';

export interface ShuffleResult {
  total_assigned: number;
  rooms: { room_name: string; assigned_count: number }[];
  unassigned_count: number;
  shortfall_warning?: string;
}

export interface RoomPdfData {
  school_name: string;
  room_name: string;
  sitting_capacity: number;
  grid_cols: number | null;
  grid_rows: number | null;
  exam_names: string[];
  students: RoomStudentRow[];
}

export interface MasterPdfRoomEntry {
  class_name: string;
  subject_name: string;
  invigilator_name: string;
  student_count: number;
}

export interface MasterPdfRoomSection {
  room_name: string;
  entries: MasterPdfRoomEntry[];
}

export interface MasterPdfData {
  school_name: string;
  exam_name: string;
  date?: string;
  rooms: MasterPdfRoomSection[];
}

@Injectable()
export class ExamSittingService {
  constructor(
    private readonly repo: ExamSittingRepository,
    private readonly hallService: ExamHallService,
    private readonly examService: ExamService,
    private readonly scheduleRepo: ExamScheduleRepository,
    private readonly redis: RedisService,
  ) {}

  async findAll(
    schoolId: string,
    filters: FilterSittingPlanDto,
  ): Promise<PaginationResponse<ExamSittingPlan>> {
    const key = `${REDIS_EXAM_KEYS.SITTING.LIST(schoolId, filters.exam_id ?? 'all')}:${JSON.stringify(filters)}`;
    return this.redis.getOrSet(key, REDIS_EXAM_KEYS.LIST_TTL, async () => {
      const [items, total] = await Promise.all([
        this.repo.findAll(schoolId, filters),
        this.repo.count(schoolId, filters),
      ]);
      return PaginationResponse.of(items, total, filters);
    });
  }

  async findById(id: string, schoolId: string): Promise<ExamSittingPlan> {
    const key = REDIS_EXAM_KEYS.SITTING.ITEM(schoolId, id);
    return this.redis.getOrSet(key, REDIS_EXAM_KEYS.ITEM_TTL, async () => {
      const plan = await this.repo.findById(id, schoolId);
      if (!plan) throw new NotFoundException(`Sitting plan entry '${id}' not found`);
      return plan;
    });
  }

  async bulkCreate(
    dto: CreateSittingPlanBulkDto,
    schoolId: string,
    createdBy: string,
  ): Promise<ExamSittingPlan[]> {
    const { exam_id, academic_year_id, entries } = dto;

    const roomCapacityMap = new Map<string, number>();
    const roomOccupiedMap = new Map<string, number>();

    for (const entry of entries) {
      if (!roomCapacityMap.has(entry.hall_detail_id)) {
        const detail = await this.hallService.findDetailById(entry.hall_detail_id, schoolId);
        roomCapacityMap.set(entry.hall_detail_id, detail.sitting_capacity);
        const occupied = await this.repo.countSeatsOccupied(
          exam_id,
          entry.hall_detail_id,
          schoolId,
        );
        roomOccupiedMap.set(entry.hall_detail_id, occupied);
      }

      const existing = await this.repo.findByStudentAndExam(entry.student_id, exam_id, schoolId);
      if (existing) {
        throw new ConflictException(
          `Student '${entry.student_id}' already has a sitting plan for this exam`,
        );
      }

      const capacity = roomCapacityMap.get(entry.hall_detail_id)!;
      const occupied = roomOccupiedMap.get(entry.hall_detail_id)!;
      if (occupied >= capacity) {
        throw new BadRequestException(
          `Room '${entry.hall_detail_id}' has reached its sitting capacity of ${capacity}`,
        );
      }
      roomOccupiedMap.set(entry.hall_detail_id, occupied + 1);
    }

    const rows = entries.map((entry) => ({
      id: generateId(),
      school_id: schoolId,
      academic_year_id,
      exam_id,
      hall_detail_id: entry.hall_detail_id,
      student_id: entry.student_id,
      seat_number: entry.seat_number ?? null,
      roll_number: entry.roll_number ?? null,
      created_by: createdBy,
    }));

    const created = await this.repo.createMany(rows);
    await this.redis.delByPattern(REDIS_EXAM_KEYS.SITTING.PATTERN(schoolId, exam_id));
    await this.syncScheduleHalls(exam_id, schoolId);
    return created;
  }

  /**
   * After sitting-plan seats are written, sync exam_schedules.hall_detail_id
   * to the room each class actually ended up in (majority room, if split
   * across more than one) — otherwise the schedule page and master print
   * never learn which room was assigned during seating.
   */
  private async syncScheduleHalls(examId: string, schoolId: string): Promise<void> {
    const counts = await this.repo.countSeatsByRoomAndClassId(examId, schoolId);
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

  async update(id: string, schoolId: string, dto: UpdateSittingPlanDto): Promise<ExamSittingPlan> {
    const existing = await this.findById(id, schoolId);

    if (dto.hall_detail_id && dto.hall_detail_id !== existing.hall_detail_id) {
      const detail = await this.hallService.findDetailById(dto.hall_detail_id, schoolId);
      const occupied = await this.repo.countSeatsOccupied(
        existing.exam_id,
        dto.hall_detail_id,
        schoolId,
      );
      if (occupied >= detail.sitting_capacity) {
        throw new BadRequestException(
          `Room '${dto.hall_detail_id}' has reached its sitting capacity of ${detail.sitting_capacity}`,
        );
      }
    }

    const updated = await this.repo.update(id, schoolId, dto);
    await this.redis.delByPattern(REDIS_EXAM_KEYS.SITTING.PATTERN(schoolId, existing.exam_id));
    return updated;
  }

  async remove(id: string, schoolId: string): Promise<void> {
    const existing = await this.findById(id, schoolId);
    await this.repo.softDelete(id, schoolId);
    await this.redis.delByPattern(REDIS_EXAM_KEYS.SITTING.PATTERN(schoolId, existing.exam_id));
  }

  /**
   * Riffle-interleave a roll-number-sorted list so originally adjacent roll
   * numbers end up spread apart (anti-cheating fallback for a single-class
   * group, and the base ordering fed into the cross-group interleave below).
   */
  private spaceByRollNumber<T extends { roll_number: string | null }>(list: T[]): T[] {
    const sorted = [...list].sort((a, b) =>
      (a.roll_number ?? '').localeCompare(b.roll_number ?? '', undefined, { numeric: true }),
    );
    const mid = Math.ceil(sorted.length / 2);
    const first = sorted.slice(0, mid);
    const second = sorted.slice(mid);
    const result: T[] = [];
    for (let i = 0; i < first.length; i++) {
      result.push(first[i]);
      if (second[i]) result.push(second[i]);
    }
    return result;
  }

  /**
   * Auto-seat students for an exam across the given rooms.
   * Anti-cheating strategy: within each class-section group, roll numbers
   * are riffle-spaced (no two originally-adjacent roll numbers end up next
   * to each other); groups are then round-robin interleaved across seats so
   * a multi-class room never has two same-class-section neighbours either.
   */
  async autoShuffle(
    dto: AutoShuffleSittingPlanDto,
    schoolId: string,
    createdBy: string,
  ): Promise<ShuffleResult> {
    const { exam_id, academic_year_id, hall_detail_ids, clear_existing = true } = dto;

    const exam = await this.examService.findById(exam_id, schoolId);
    const classIds = dto.class_ids && dto.class_ids.length > 0 ? dto.class_ids : exam.class_ids;
    if (classIds.length === 0) {
      throw new BadRequestException('This exam has no participating classes to seat');
    }

    // 1. Fetch students per class, grouped by class+section
    const groupMap = new Map<string, StudentForShuffle[]>();
    for (const classId of classIds) {
      const studentsForClass = await this.repo.findStudentsForExam(
        exam_id,
        classId,
        academic_year_id,
        schoolId,
      );
      for (const s of studentsForClass) {
        const groupKey = `${classId}__${s.section_id ?? 'none'}`;
        if (!groupMap.has(groupKey)) groupMap.set(groupKey, []);
        groupMap.get(groupKey)!.push(s);
      }
    }

    // 2. Space out roll numbers within each group, then round-robin interleave across groups
    const groups = [...groupMap.values()].map((g) => this.spaceByRollNumber(g));
    const shuffled: StudentForShuffle[] = [];
    const maxLen = groups.length > 0 ? Math.max(...groups.map((g) => g.length)) : 0;
    for (let i = 0; i < maxLen; i++) {
      for (const group of groups) {
        if (i < group.length) shuffled.push(group[i]);
      }
    }

    // 3. Clear existing
    if (clear_existing) {
      await this.repo.softDeleteByExamIds([exam_id], schoolId);
      await this.redis.delByPattern(REDIS_EXAM_KEYS.SITTING.PATTERN(schoolId, exam_id));
    }

    // 4. Fill rooms in order
    const roomResults: { room_name: string; assigned_count: number }[] = [];
    const allRows: Parameters<typeof this.repo.createMany>[0] = [];
    let studentIdx = 0;
    let totalCapacity = 0;

    for (const hallDetailId of hall_detail_ids) {
      const room = await this.hallService.findDetailById(hallDetailId, schoolId);
      totalCapacity += room.sitting_capacity;
      let seatNum = 1;
      let assignedInRoom = 0;

      while (studentIdx < shuffled.length && assignedInRoom < room.sitting_capacity) {
        const s = shuffled[studentIdx++];
        allRows.push({
          id: generateId(),
          school_id: schoolId,
          academic_year_id,
          exam_id,
          hall_detail_id: hallDetailId,
          student_id: s.student_id,
          seat_number: seatNum++,
          roll_number: s.roll_number ?? null,
          created_by: createdBy,
        });
        assignedInRoom++;
      }
      roomResults.push({ room_name: room.room_name, assigned_count: assignedInRoom });
    }

    if (allRows.length > 0) {
      await this.repo.createMany(allRows);
      await this.redis.delByPattern(REDIS_EXAM_KEYS.SITTING.PATTERN(schoolId, exam_id));
      await this.syncScheduleHalls(exam_id, schoolId);
    }

    const unassignedCount = shuffled.length - allRows.length;
    return {
      total_assigned: allRows.length,
      rooms: roomResults,
      unassigned_count: unassignedCount,
      shortfall_warning:
        unassignedCount > 0
          ? `${unassignedCount} student(s) could not be seated — total room capacity ` +
            `(${totalCapacity}) is less than the number of students (${shuffled.length}). ` +
            `Add another room or increase capacity.`
          : undefined,
    };
  }

  async getRoomPdfData(dto: RoomPdfQueryDto, schoolId: string): Promise<RoomPdfData> {
    const [room, schoolName] = await Promise.all([
      this.hallService.findDetailById(dto.hall_detail_id, schoolId),
      this.repo.findSchoolName(schoolId),
    ]);
    const examNames: string[] = [];
    for (const examId of dto.exam_ids) {
      const exam = await this.examService.findById(examId, schoolId);
      examNames.push(exam.exam_name);
    }
    const studentRows = await this.repo.findRoomStudents(
      dto.exam_ids,
      dto.hall_detail_id,
      schoolId,
    );
    return {
      school_name: schoolName,
      room_name: room.room_name,
      sitting_capacity: room.sitting_capacity,
      grid_cols: room.grid_cols ?? null,
      grid_rows: room.grid_rows ?? null,
      exam_names: [...new Set(examNames)],
      students: studentRows,
    };
  }

  /**
   * Root-level overview for the exam controller: every room used by this
   * exam (optionally scoped to one day), with its class(es), subject(s),
   * invigilator, and seated student count — one document instead of
   * flipping through per-room PDFs.
   */
  async getMasterPdfData(examId: string, schoolId: string, date?: string): Promise<MasterPdfData> {
    const [exam, schoolName, scheduleRows, seatCounts] = await Promise.all([
      this.examService.findById(examId, schoolId),
      this.repo.findSchoolName(schoolId),
      this.scheduleRepo.findSchedulesForMasterPdf(schoolId, examId, date),
      this.repo.countSeatsByRoomAndClass(examId, schoolId),
    ]);

    const seatCountMap = new Map<string, number>();
    for (const s of seatCounts) {
      seatCountMap.set(`${s.hall_detail_id}__${s.class_name}`, s.count);
    }

    const roomMap = new Map<string, MasterPdfRoomSection>();
    for (const row of scheduleRows) {
      if (!row.hall_detail_id || !row.room_name) continue; // no room assigned yet
      if (!roomMap.has(row.hall_detail_id)) {
        roomMap.set(row.hall_detail_id, { room_name: row.room_name, entries: [] });
      }
      const invigilatorName =
        [row.invigilator_first_name, row.invigilator_last_name].filter(Boolean).join(' ') ||
        'Unassigned';
      const className = row.class_name ?? 'Unknown Class';
      roomMap.get(row.hall_detail_id)!.entries.push({
        class_name: className,
        subject_name: row.subject_name,
        invigilator_name: invigilatorName,
        student_count: seatCountMap.get(`${row.hall_detail_id}__${className}`) ?? 0,
      });
    }

    return {
      school_name: schoolName,
      exam_name: exam.exam_name,
      date,
      rooms: [...roomMap.values()],
    };
  }
}
