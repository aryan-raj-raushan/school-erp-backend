import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ExamSittingRepository } from './exam-sitting.repository';
import { ExamHallService } from '../exam-hall/exam-hall.service';
import { ExamService } from '../exam-manage/exam.service';
import { RedisService } from '../../redis/redis.service';
import {
  CreateSittingPlanBulkDto,
  UpdateSittingPlanDto,
  FilterSittingPlanDto,
  AutoShuffleSittingPlanDto,
  RoomPdfQueryDto,
} from './dto/exam-sitting.dto';
import { ExamSittingPlan } from './types/exam-sitting.types';
import type { RoomStudentRow } from './exam-sitting.repository';
import { REDIS_EXAM_KEYS } from '@shared/redis/redis-key';
import { PaginationResponse } from '@shared/responses/api-response';
import { generateId } from '@utils/uuid.utils';

export interface ShuffleResult {
  total_assigned: number;
  rooms: { room_name: string; assigned_count: number }[];
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

@Injectable()
export class ExamSittingService {
  constructor(
    private readonly repo: ExamSittingRepository,
    private readonly hallService: ExamHallService,
    private readonly examService: ExamService,
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
        const occupied = await this.repo.countSeatsOccupied(exam_id, entry.hall_detail_id, schoolId);
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
    return created;
  }

  async update(id: string, schoolId: string, dto: UpdateSittingPlanDto): Promise<ExamSittingPlan> {
    const existing = await this.findById(id, schoolId);

    if (dto.hall_detail_id && dto.hall_detail_id !== existing.hall_detail_id) {
      const detail = await this.hallService.findDetailById(dto.hall_detail_id, schoolId);
      const occupied = await this.repo.countSeatsOccupied(existing.exam_id, dto.hall_detail_id, schoolId);
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

  async autoShuffle(
    dto: AutoShuffleSittingPlanDto,
    schoolId: string,
    createdBy: string,
  ): Promise<ShuffleResult> {
    const { exam_ids, academic_year_id, hall_detail_ids, clear_existing = true } = dto;

    // 1. Fetch each exam → students per class, grouped by class+section
    const groupMap = new Map<string, { student_id: string; exam_id: string; roll_number: string | null }[]>();

    for (const examId of exam_ids) {
      const exam = await this.examService.findById(examId, schoolId);
      const studentsForExam = await this.repo.findStudentsForExam(
        examId,
        exam.class_id,
        academic_year_id,
        schoolId,
      );
      for (const s of studentsForExam) {
        const groupKey = `${exam.class_id}__${s.section_id ?? 'none'}`;
        if (!groupMap.has(groupKey)) groupMap.set(groupKey, []);
        groupMap.get(groupKey)!.push({ student_id: s.student_id, exam_id: examId, roll_number: s.roll_number });
      }
    }

    // 2. Round-robin interleave across groups
    const groups = [...groupMap.values()];
    const shuffled: { student_id: string; exam_id: string; roll_number: string | null }[] = [];
    let maxLen = Math.max(...groups.map((g) => g.length));
    for (let i = 0; i < maxLen; i++) {
      for (const group of groups) {
        if (i < group.length) shuffled.push(group[i]);
      }
    }

    // 3. Clear existing
    if (clear_existing) {
      await this.repo.softDeleteByExamIds(exam_ids, schoolId);
      for (const examId of exam_ids) {
        await this.redis.delByPattern(REDIS_EXAM_KEYS.SITTING.PATTERN(schoolId, examId));
      }
    }

    // 4. Fill rooms in order
    const roomResults: { room_name: string; assigned_count: number }[] = [];
    const allRows: Parameters<typeof this.repo.createMany>[0] = [];
    let studentIdx = 0;

    for (const hallDetailId of hall_detail_ids) {
      const room = await this.hallService.findDetailById(hallDetailId, schoolId);
      let seatNum = 1;
      let assignedInRoom = 0;

      while (studentIdx < shuffled.length && assignedInRoom < room.sitting_capacity) {
        const s = shuffled[studentIdx++];
        allRows.push({
          id: generateId(),
          school_id: schoolId,
          academic_year_id,
          exam_id: s.exam_id,
          hall_detail_id: hallDetailId,
          student_id: s.student_id,
          seat_number: seatNum++,
          roll_number: s.roll_number ?? null,
          created_by: createdBy,
        });
        assignedInRoom++;
      }
      roomResults.push({ room_name: room.room_name, assigned_count: assignedInRoom });
      if (studentIdx >= shuffled.length) break;
    }

    if (allRows.length > 0) {
      await this.repo.createMany(allRows);
      for (const examId of exam_ids) {
        await this.redis.delByPattern(REDIS_EXAM_KEYS.SITTING.PATTERN(schoolId, examId));
      }
    }

    return { total_assigned: allRows.length, rooms: roomResults };
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
    const studentRows = await this.repo.findRoomStudents(dto.exam_ids, dto.hall_detail_id, schoolId);
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
}
