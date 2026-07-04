import { Injectable, Inject } from '@nestjs/common';
import { eq, and, sql, or, isNull, getTableColumns, gte, lte, inArray } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../../database/drizzle/drizzle.provider';
import { ExamSchedule, NewExamSchedule } from './types/exam-schedule.types';
import { FilterExamScheduleDto } from './dto/exam-schedule.dto';
import { examSchedules } from '@database/drizzle/schema/exam-schedule.schema';
import { sections } from '@database/drizzle/schema/sections.schema';
import { classes } from '@database/drizzle/schema/classes.schema';
import { examHallDetails } from '@database/drizzle/schema/exam-hall-details.schema';
import { schoolUsers } from '@database/drizzle/schema/school-users.schema';
import { examAttendance } from '@database/drizzle/schema/exam-attendance.schema';

export interface MasterPdfScheduleRow {
  hall_detail_id: string | null;
  room_name: string | null;
  class_name: string | null;
  subject_name: string;
  exam_date: string;
  invigilator_first_name: string | null;
  invigilator_last_name: string | null;
}

@Injectable()
export class ExamScheduleRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  private buildConditions(schoolId: string, filters: FilterExamScheduleDto) {
    const conditions = [eq(examSchedules.school_id, schoolId), eq(examSchedules.deleted, false)];

    if (filters.academic_year_id)
      conditions.push(eq(examSchedules.academic_year_id, filters.academic_year_id));
    if (filters.class_id) conditions.push(eq(examSchedules.class_id, filters.class_id));
    if (filters.section_id) conditions.push(eq(examSchedules.section_id, filters.section_id));
    if (filters.exam_id) conditions.push(eq(examSchedules.exam_id, filters.exam_id));
    if (filters.subject_id) conditions.push(eq(examSchedules.subject_id, filters.subject_id));
    if (filters.subject_type) conditions.push(eq(examSchedules.subject_type, filters.subject_type));
    if (filters.exam_date) conditions.push(eq(examSchedules.exam_date, filters.exam_date));

    return conditions;
  }

  async findAll(
    schoolId: string,
    filters: FilterExamScheduleDto,
  ): Promise<(ExamSchedule & { section_name: string | null })[]> {
    const conditions = this.buildConditions(schoolId, filters);
    const limit = filters.limit ?? 50;
    const offset = ((filters.page ?? 1) - 1) * limit;

    return this.db
      .select({ ...getTableColumns(examSchedules), section_name: sections.name })
      .from(examSchedules)
      .leftJoin(sections, eq(examSchedules.section_id, sections.id))
      .where(and(...conditions))
      .orderBy(examSchedules.exam_date, examSchedules.start_time)
      .limit(limit)
      .offset(offset) as any;
  }

  async count(schoolId: string, filters: FilterExamScheduleDto): Promise<number> {
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(examSchedules)
      .where(and(...this.buildConditions(schoolId, filters)));
    return Number(count);
  }

  async findById(id: string, schoolId: string): Promise<ExamSchedule | undefined> {
    const [row] = await this.db
      .select()
      .from(examSchedules)
      .where(
        and(
          eq(examSchedules.id, id),
          eq(examSchedules.school_id, schoolId),
          eq(examSchedules.deleted, false),
        ),
      );
    return row;
  }

  /**
   * Detect time conflicts: same school / exam / class, same date, overlapping time slot.
   * Excludes a given id (useful when updating).
   */
  async findConflict(
    schoolId: string,
    examId: string,
    classId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeId?: string,
  ): Promise<ExamSchedule[]> {
    const conditions = [
      eq(examSchedules.school_id, schoolId),
      eq(examSchedules.exam_id, examId),
      eq(examSchedules.class_id, classId),
      eq(examSchedules.exam_date, date),
      eq(examSchedules.deleted, false),
      // overlap: existing.start < new.end AND existing.end > new.start
      sql`${examSchedules.start_time} < ${endTime}::time`,
      sql`${examSchedules.end_time} > ${startTime}::time`,
    ];

    const rows = await this.db
      .select()
      .from(examSchedules)
      .where(and(...conditions));

    return excludeId ? rows.filter((r) => r.id !== excludeId) : rows;
  }

  /**
   * Check if the same subject is already scheduled for this exam/class.
   */
  async findDuplicate(
    schoolId: string,
    examId: string,
    classId: string,
    subjectId: string,
    excludeId?: string,
  ): Promise<ExamSchedule | undefined> {
    const rows = await this.db
      .select()
      .from(examSchedules)
      .where(
        and(
          eq(examSchedules.school_id, schoolId),
          eq(examSchedules.exam_id, examId),
          eq(examSchedules.class_id, classId),
          eq(examSchedules.subject_id, subjectId),
          eq(examSchedules.subject_type, 'MAIN_EXAM'),
          isNull(examSchedules.parent_schedule_id),
          eq(examSchedules.deleted, false),
        ),
      );
    const filtered = excludeId ? rows.filter((r) => r.id !== excludeId) : rows;
    return filtered[0];
  }

  async findByParentId(parentId: string, schoolId: string): Promise<ExamSchedule[]> {
    return this.db
      .select()
      .from(examSchedules)
      .where(
        and(
          eq(examSchedules.parent_schedule_id, parentId),
          eq(examSchedules.school_id, schoolId),
          eq(examSchedules.deleted, false),
        ),
      );
  }

  async createMany(data: NewExamSchedule[]): Promise<ExamSchedule[]> {
    return this.db.insert(examSchedules).values(data).returning();
  }

  /**
   * Existing invigilator bookings for the given teachers within a date range —
   * used to seed the conflict map for auto-generate / bulk-update.
   */
  async findInvigilatorBusySlots(
    schoolId: string,
    teacherIds: string[],
    fromDate: string,
    toDate: string,
  ): Promise<{ teacher_id: string; date: string; start_time: string; end_time: string }[]> {
    if (teacherIds.length === 0) return [];
    const rows = await this.db
      .select({
        teacher_id: examSchedules.exam_invigilator_id,
        date: examSchedules.exam_date,
        start_time: examSchedules.start_time,
        end_time: examSchedules.end_time,
      })
      .from(examSchedules)
      .where(
        and(
          eq(examSchedules.school_id, schoolId),
          eq(examSchedules.deleted, false),
          inArray(examSchedules.exam_invigilator_id, teacherIds),
          gte(examSchedules.exam_date, fromDate),
          lte(examSchedules.exam_date, toDate),
        ),
      );
    return rows as { teacher_id: string; date: string; start_time: string; end_time: string }[];
  }

  /** Room/class/subject/invigilator rows for the master overview print. */
  async findSchedulesForMasterPdf(
    schoolId: string,
    examId: string,
    date?: string,
  ): Promise<MasterPdfScheduleRow[]> {
    const conditions = [
      eq(examSchedules.school_id, schoolId),
      eq(examSchedules.exam_id, examId),
      eq(examSchedules.deleted, false),
      isNull(examSchedules.parent_schedule_id),
    ];
    if (date) conditions.push(eq(examSchedules.exam_date, date));

    return this.db
      .select({
        hall_detail_id: examSchedules.hall_detail_id,
        room_name: examHallDetails.room_name,
        class_name: classes.name,
        subject_name: examSchedules.subject_name,
        exam_date: examSchedules.exam_date,
        invigilator_first_name: schoolUsers.first_name,
        invigilator_last_name: schoolUsers.last_name,
      })
      .from(examSchedules)
      .leftJoin(examHallDetails, eq(examHallDetails.id, examSchedules.hall_detail_id))
      .leftJoin(classes, eq(classes.id, examSchedules.class_id))
      .leftJoin(schoolUsers, eq(schoolUsers.id, examSchedules.exam_invigilator_id))
      .where(and(...conditions))
      .orderBy(examSchedules.exam_date);
  }

  async create(data: NewExamSchedule): Promise<ExamSchedule> {
    const [row] = await this.db.insert(examSchedules).values(data).returning();
    return row;
  }

  async update(
    id: string,
    schoolId: string,
    data: Partial<NewExamSchedule>,
  ): Promise<ExamSchedule> {
    const [row] = await this.db
      .update(examSchedules)
      .set({ ...data, updated_at: new Date() })
      .where(and(eq(examSchedules.id, id), eq(examSchedules.school_id, schoolId)))
      .returning();
    return row;
  }

  async hardDelete(id: string, schoolId: string): Promise<void> {
    await this.db
      .delete(examSchedules)
      .where(
        and(
          or(eq(examSchedules.id, id), eq(examSchedules.parent_schedule_id, id))!,
          eq(examSchedules.school_id, schoolId),
        ),
      );
  }

  /** Top-level (non-locked) rows for an exam still missing a hall or invigilator — blocks publish. */
  async findIncompleteScheduleIds(examId: string, schoolId: string): Promise<string[]> {
    const rows = await this.db
      .select({ id: examSchedules.id })
      .from(examSchedules)
      .where(
        and(
          eq(examSchedules.school_id, schoolId),
          eq(examSchedules.exam_id, examId),
          eq(examSchedules.deleted, false),
          eq(examSchedules.locked, false),
          isNull(examSchedules.parent_schedule_id),
          or(isNull(examSchedules.hall_detail_id), isNull(examSchedules.exam_invigilator_id)),
        ),
      );
    return rows.map((r) => r.id);
  }

  async findByIds(ids: string[], schoolId: string): Promise<ExamSchedule[]> {
    if (ids.length === 0) return [];
    return this.db
      .select()
      .from(examSchedules)
      .where(
        and(
          eq(examSchedules.school_id, schoolId),
          eq(examSchedules.deleted, false),
          inArray(examSchedules.id, ids),
        ),
      );
  }

  async findAllByExam(examId: string, schoolId: string): Promise<ExamSchedule[]> {
    return this.db
      .select()
      .from(examSchedules)
      .where(
        and(
          eq(examSchedules.school_id, schoolId),
          eq(examSchedules.exam_id, examId),
          eq(examSchedules.deleted, false),
        ),
      );
  }

  async setLocked(ids: string[], schoolId: string, locked: boolean): Promise<void> {
    if (ids.length === 0) return;
    await this.db
      .update(examSchedules)
      .set({ locked, updated_at: new Date() })
      .where(and(eq(examSchedules.school_id, schoolId), inArray(examSchedules.id, ids)));
  }

  /**
   * Sets the room for every (unlocked) schedule row of a class within an
   * exam — used to sync exam_schedules.hall_detail_id after a sitting plan
   * is created, so the schedule reflects the room students were seated in.
   */
  async setHallForClass(
    examId: string,
    classId: string,
    schoolId: string,
    hallDetailId: string,
  ): Promise<void> {
    await this.db
      .update(examSchedules)
      .set({ hall_detail_id: hallDetailId, updated_at: new Date() })
      .where(
        and(
          eq(examSchedules.school_id, schoolId),
          eq(examSchedules.exam_id, examId),
          eq(examSchedules.class_id, classId),
          eq(examSchedules.locked, false),
        ),
      );
  }

  /** Applies the same partial fields to every (unlocked) row in `ids`. */
  async bulkUpdate(
    ids: string[],
    schoolId: string,
    data: Partial<NewExamSchedule>,
  ): Promise<ExamSchedule[]> {
    if (ids.length === 0) return [];
    return this.db
      .update(examSchedules)
      .set({ ...data, updated_at: new Date() })
      .where(
        and(
          eq(examSchedules.school_id, schoolId),
          eq(examSchedules.locked, false),
          inArray(examSchedules.id, ids),
        ),
      )
      .returning();
  }

  /** Which of these schedule ids already have attendance recorded (downstream data guard). */
  async findScheduleIdsWithAttendance(
    scheduleIds: string[],
    schoolId: string,
  ): Promise<Set<string>> {
    if (scheduleIds.length === 0) return new Set();
    const rows = await this.db
      .select({ schedule_id: examAttendance.schedule_id })
      .from(examAttendance)
      .where(
        and(
          eq(examAttendance.school_id, schoolId),
          eq(examAttendance.deleted, false),
          inArray(examAttendance.schedule_id, scheduleIds),
        ),
      );
    return new Set(rows.map((r) => r.schedule_id));
  }

  /** Hard-deletes every schedule row (incl. sub-schedules) for an exam — used by the exam.deleted cascade. */
  async hardDeleteByExam(examId: string, schoolId: string): Promise<void> {
    await this.db
      .delete(examSchedules)
      .where(and(eq(examSchedules.school_id, schoolId), eq(examSchedules.exam_id, examId)));
  }

  async bulkHardDelete(ids: string[], schoolId: string): Promise<void> {
    if (ids.length === 0) return;
    await this.db
      .delete(examSchedules)
      .where(
        and(
          eq(examSchedules.school_id, schoolId),
          eq(examSchedules.locked, false),
          or(inArray(examSchedules.id, ids), inArray(examSchedules.parent_schedule_id, ids)),
        ),
      );
  }
}
