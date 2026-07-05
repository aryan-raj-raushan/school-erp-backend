import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { APP_EVENTS } from '@shared/events/event-names';
import { generateId } from '../../../utils/uuid.utils';
import { PaginationResponse } from '../../../shared/responses/api-response';
import {
  CreateExamDto,
  UpdateExamDto,
  FilterExamDto,
  PublishExamDto,
  AutoGenerateExamDto,
  AutoGenerateConflictDto,
  ChangeExamStatusDto,
  CopyExamDto,
} from './dto/exam.dto';
import { ExamWithClasses } from './types/exam.types';
import { NewExamSchedule, ExamSchedule } from '../exam-schedule/types/exam-schedule.types';
import { SubjectType, ExamStatus, EXAM_STATUS_TRANSITIONS } from '@shared/enums/exam.enum';
import { REDIS_EXAM_KEYS } from '@shared/redis/redis-key';
import { RedisService } from '@modules/redis/redis.service';
import { ExamRepository } from './exam.repository';
import { ExamScheduleRepository } from '../exam-schedule/exam-schedule.repository';
import { ClassSubjectTeacherService } from '@modules/class-subject-teacher/class-subject-teacher.service';
import { HolidaysService } from '@modules/holidays/holidays.service';
import { SchoolSettingsService } from '@modules/school-settings/school-settings.service';
import { ExamTemplateService } from '../exam-templates/exam-template.service';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';

const DAY_CODE_TO_WEEKDAY: Record<string, number> = {
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
};

export interface AutoGenerateExamResult {
  exam: ExamWithClasses;
  schedules: ExamSchedule[];
  conflicts: AutoGenerateConflictDto[];
}

@Injectable()
export class ExamService {
  constructor(
    private readonly repo: ExamRepository,
    private readonly scheduleRepo: ExamScheduleRepository,
    private readonly classSubjectTeachers: ClassSubjectTeacherService,
    private readonly holidays: HolidaysService,
    private readonly schoolSettings: SchoolSettingsService,
    private readonly templates: ExamTemplateService,
    private readonly redis: RedisService,
    private readonly auditLogs: AuditLogsService,
    private readonly events: EventEmitter2,
  ) {}

  /** Rejects create/update when the exam's date range overlaps another exam sharing a class. */
  private async assertNoTimelineOverlap(
    schoolId: string,
    academicYearId: string,
    classIds: string[],
    startDate: string,
    endDate: string,
    excludeExamId?: string,
  ): Promise<void> {
    const overlapping = await this.repo.findOverlapping(
      schoolId,
      academicYearId,
      classIds,
      startDate,
      endDate,
      excludeExamId,
    );
    if (overlapping.length > 0) {
      throw new BadRequestException(
        `Exam dates overlap with '${overlapping[0].exam_name}' (${overlapping[0].start_date} to ${overlapping[0].end_date}) for a shared class — adjust the dates or classes`,
      );
    }
  }

  private logAudit(
    schoolId: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE',
    examId: string,
    userId: string,
    extra?: Record<string, unknown>,
  ) {
    this.auditLogs
      .log({ school_id: schoolId, entity: 'EXAM', entity_id: examId, action, changed_by: userId, new_value: extra })
      .catch(() => {});
  }

  async findAll(
    schoolId: string,
    filters: FilterExamDto,
  ): Promise<PaginationResponse<ExamWithClasses>> {
    const key = `${REDIS_EXAM_KEYS.EXAM.LIST(schoolId)}:${JSON.stringify(filters)}`;
    return this.redis.getOrSet(key, REDIS_EXAM_KEYS.LIST_TTL, async () => {
      const [items, total] = await Promise.all([
        this.repo.findAll(schoolId, filters),
        this.repo.count(schoolId, filters),
      ]);
      return PaginationResponse.of(items, total, filters);
    });
  }

  async findById(id: string, schoolId: string): Promise<ExamWithClasses> {
    const key = REDIS_EXAM_KEYS.EXAM.ITEM(schoolId, id);
    return this.redis.getOrSet(key, REDIS_EXAM_KEYS.ITEM_TTL, async () => {
      const exam = await this.repo.findById(id, schoolId);
      if (!exam) throw new NotFoundException(`Exam '${id}' not found`);
      return exam;
    });
  }

  /**
   * Derives a free exam code for this academic year, e.g. "TERM1-2026". If
   * that base code is already taken by another live exam, appends "-2",
   * "-3", ... until a free one is found — so auto-generate can create
   * multiple exams for the same term/year without a manual code edit.
   */
  private async deriveExamCode(
    schoolId: string,
    academicYearId: string,
    examTerm: string,
    startDate: string,
  ): Promise<string> {
    const base = `${examTerm}-${startDate.slice(0, 4)}`;
    const taken = await this.repo.findCodesWithPrefix(schoolId, academicYearId, base);
    if (!taken.has(base)) return base;
    let n = 2;
    while (taken.has(`${base}-${n}`)) n++;
    return `${base}-${n}`;
  }

  async create(dto: CreateExamDto, schoolId: string, createdBy: string): Promise<ExamWithClasses> {
    const { class_ids, code, ...examFields } = dto;
    await this.assertNoTimelineOverlap(
      schoolId,
      dto.academic_year_id,
      class_ids,
      dto.start_date,
      dto.end_date,
    );
    const exam = await this.repo.create({
      id: generateId(),
      school_id: schoolId,
      created_by: createdBy,
      code:
        code ??
        (await this.deriveExamCode(schoolId, dto.academic_year_id, dto.exam_term, dto.start_date)),
      ...examFields,
    });
    await this.repo.replaceExamClasses(exam.id, schoolId, dto.academic_year_id, class_ids);
    await this.redis.delByPattern(REDIS_EXAM_KEYS.EXAM.PATTERN(schoolId));
    this.logAudit(schoolId, 'CREATE', exam.id, createdBy);
    return { ...exam, class_ids };
  }

  async update(
    id: string,
    schoolId: string,
    dto: UpdateExamDto,
    userId?: string,
  ): Promise<ExamWithClasses> {
    const existing = await this.findById(id, schoolId);
    const { class_ids, ...examFields } = dto;
    await this.assertNoTimelineOverlap(
      schoolId,
      dto.academic_year_id ?? existing.academic_year_id,
      class_ids ?? existing.class_ids,
      dto.start_date ?? existing.start_date,
      dto.end_date ?? existing.end_date,
      id,
    );
    const updated = await this.repo.update(id, schoolId, examFields);
    if (class_ids) {
      await this.repo.replaceExamClasses(
        id,
        schoolId,
        dto.academic_year_id ?? existing.academic_year_id,
        class_ids,
      );
    }
    await this.redis.delByPattern(REDIS_EXAM_KEYS.EXAM.PATTERN(schoolId));
    if (userId) this.logAudit(schoolId, 'UPDATE', id, userId);
    return { ...updated, class_ids: class_ids ?? existing.class_ids };
  }

  async publish(id: string, schoolId: string, dto: PublishExamDto): Promise<ExamWithClasses> {
    const existing = await this.findById(id, schoolId);
    const updated = await this.repo.update(id, schoolId, { is_published: dto.is_published });
    await this.redis.delByPattern(REDIS_EXAM_KEYS.EXAM.PATTERN(schoolId));
    return { ...updated, class_ids: existing.class_ids };
  }

  async remove(id: string, schoolId: string, userId?: string): Promise<void> {
    await this.findById(id, schoolId);
    await this.repo.softDelete(id, schoolId);
    await this.redis.delByPattern(REDIS_EXAM_KEYS.EXAM.PATTERN(schoolId));
    if (userId) this.logAudit(schoolId, 'DELETE', id, userId);
    // Exam row stays soft-deleted (restore() still works); its schedules,
    // attendance and sitting-plan rows are hard-deleted by the listener.
    this.events.emit(APP_EVENTS.EXAM.DELETED, { examId: id, schoolId });
  }

  async restore(id: string, schoolId: string): Promise<ExamWithClasses> {
    const existing = await this.repo.findByIdIncludingDeleted(id, schoolId);
    if (!existing) throw new NotFoundException(`Exam '${id}' not found`);
    await this.repo.restore(id, schoolId);
    await this.redis.delByPattern(REDIS_EXAM_KEYS.EXAM.PATTERN(schoolId));
    return this.findById(id, schoolId);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /**
   * Transitions the exam's status, validating the move is allowed and — when
   * moving to PUBLISHED — that every non-locked schedule row has both a hall
   * and an invigilator assigned.
   */
  async changeStatus(
    id: string,
    schoolId: string,
    dto: ChangeExamStatusDto,
    userId: string,
  ): Promise<ExamWithClasses> {
    const existing = await this.findById(id, schoolId);
    const currentStatus = (existing.status as ExamStatus) ?? ExamStatus.DRAFT;
    const allowed = EXAM_STATUS_TRANSITIONS[currentStatus] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot move exam from '${currentStatus}' to '${dto.status}' — allowed next steps: ${allowed.join(', ') || 'none'}`,
      );
    }

    if (dto.status === ExamStatus.PUBLISHED) {
      const incompleteIds = await this.scheduleRepo.findIncompleteScheduleIds(id, schoolId);
      if (incompleteIds.length > 0) {
        throw new BadRequestException({
          message: `${incompleteIds.length} schedule(s) are missing a hall or invigilator`,
          incomplete_schedule_ids: incompleteIds,
        });
      }
    }

    const isPublishedDerived = [ExamStatus.PUBLISHED, ExamStatus.STARTED, ExamStatus.COMPLETED].includes(
      dto.status,
    );
    const updated = await this.repo.update(id, schoolId, {
      status: dto.status,
      is_published: isPublishedDerived,
    });
    await this.redis.delByPattern(REDIS_EXAM_KEYS.EXAM.PATTERN(schoolId));
    this.logAudit(schoolId, 'STATUS_CHANGE', id, userId, { from: currentStatus, to: dto.status });
    return { ...updated, class_ids: existing.class_ids };
  }

  /**
   * Clones an exam (+ participating classes + schedule rows) into a target
   * academic year, shifting every schedule's date by the same delta as the
   * exam's own start date. Does not clone sitting plans, attendance or marks.
   */
  async copy(
    id: string,
    schoolId: string,
    dto: CopyExamDto,
    createdBy: string,
  ): Promise<ExamWithClasses> {
    const source = await this.findById(id, schoolId);
    const sourceSchedules = await this.scheduleRepo.findAllByExam(id, schoolId);

    const deltaDays = Math.round(
      (new Date(dto.new_start_date).getTime() - new Date(source.start_date).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    const shiftDate = (date: string) => {
      const d = new Date(`${date}T00:00:00`);
      d.setDate(d.getDate() + deltaDays);
      return d.toISOString().slice(0, 10);
    };

    const newEndDate = shiftDate(source.end_date);
    await this.assertNoTimelineOverlap(
      schoolId,
      dto.target_academic_year_id,
      source.class_ids,
      dto.new_start_date,
      newEndDate,
    );

    const newExam = await this.repo.create({
      id: generateId(),
      school_id: schoolId,
      academic_year_id: dto.target_academic_year_id,
      code: await this.deriveExamCode(
        schoolId,
        dto.target_academic_year_id,
        source.exam_term,
        dto.new_start_date,
      ),
      exam_name: source.exam_name,
      exam_term: source.exam_term,
      start_date: dto.new_start_date,
      end_date: newEndDate,
      include_in_marks: source.include_in_marks,
      status: ExamStatus.DRAFT,
      is_published: false,
      is_enabled: true,
      created_by: createdBy,
    });
    await this.repo.replaceExamClasses(
      newExam.id,
      schoolId,
      dto.target_academic_year_id,
      source.class_ids,
    );

    // Clone top-level schedule rows only — invigilator/hall/lock don't carry forward year-to-year
    const parentSchedules = sourceSchedules.filter((s) => !s.parent_schedule_id);
    if (parentSchedules.length > 0) {
      const newRows: NewExamSchedule[] = parentSchedules.map((s) => ({
        id: generateId(),
        school_id: schoolId,
        academic_year_id: dto.target_academic_year_id,
        class_id: s.class_id,
        section_id: s.section_id,
        exam_id: newExam.id,
        subject_id: s.subject_id,
        subject_name: s.subject_name,
        subject_type: s.subject_type,
        exam_date: shiftDate(s.exam_date),
        start_time: s.start_time,
        end_time: s.end_time,
        exam_marks: s.exam_marks,
        passing_marks: s.passing_marks,
        exam_invigilator_id: null,
        hall_detail_id: null,
        sub_subject_enabled: false,
        parent_schedule_id: null,
        locked: false,
        is_enabled: true,
        created_by: createdBy,
      }));
      await this.scheduleRepo.createMany(newRows);
    }

    await this.redis.delByPattern(REDIS_EXAM_KEYS.EXAM.PATTERN(schoolId));
    this.logAudit(schoolId, 'CREATE', newExam.id, createdBy, { copied_from: id });
    return { ...newExam, class_ids: source.class_ids };
  }

  // ── Auto-generate ──────────────────────────────────────────────────────────

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  private minutesToTime(mins: number): string {
    return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
  }

  /** Calendar dates between start/end (inclusive) that are working days and not holidays. */
  private async buildWorkingDates(
    schoolId: string,
    academicYearId: string,
    startDate: string,
    endDate: string,
  ): Promise<string[]> {
    const timing = await this.schoolSettings.getActiveTimingForDate(schoolId, startDate);
    const workingCodes = (timing?.working_days ?? 'MON,TUE,WED,THU,FRI')
      .split(',')
      .map((c) => c.trim());
    const workingWeekdays = new Set(
      workingCodes.map((c) => DAY_CODE_TO_WEEKDAY[c]).filter((d) => d !== undefined),
    );

    const holidaysPage = await this.holidays.findAll(schoolId, {
      academic_year_id: academicYearId,
      from_date: startDate,
      to_date: endDate,
      page: 1,
      limit: 100,
    });
    const holidayDates = new Set(holidaysPage.items.map((h) => h.date));

    const dates: string[] = [];
    const cursor = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    while (cursor <= end) {
      const iso = cursor.toISOString().slice(0, 10);
      if (workingWeekdays.has(cursor.getDay()) && !holidayDates.has(iso)) dates.push(iso);
      cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
  }

  /**
   * Auto-generate a whole-school exam: pulls each class's subjects from the
   * class-subject-teacher mapping, distributes them one-per-working-day
   * across the date range, and assigns a conflict-free invigilator
   * (never the subject's own teacher, never already booked elsewhere at
   * that date/time). Never throws for a partial failure — unresolvable
   * items are reported in `conflicts` so the caller can review/fix them.
   */
  /**
   * Pure proposal builder shared by autoGenerate (new exam) and
   * regeneratePreview/regenerateApply (existing exam) — computes the ideal
   * schedule rows + conflicts without touching the database.
   */
  private async buildProposedSchedule(
    dto: AutoGenerateExamDto,
    schoolId: string,
    createdBy: string,
  ): Promise<{ scheduleRows: NewExamSchedule[]; conflicts: AutoGenerateConflictDto[] }> {
    const template = dto.template_id
      ? await this.templates.findById(dto.template_id, schoolId)
      : null;

    const dailyStart = dto.daily_start_time ?? '09:00';
    const defaultMarks = dto.default_exam_marks ?? template?.default_exam_marks ?? 100;
    const defaultPassing = dto.default_passing_marks ?? template?.default_passing_marks ?? 35;
    /** Length of a single subject's exam. */
    const subjectDurationMinutes =
      dto.subject_duration_minutes ?? template?.default_duration_minutes ?? 60;
    /** Gap between two subjects scheduled back-to-back on the same day. */
    const breakMinutes = dto.break_duration_minutes ?? 20;
    /** Total exam window available per day — defaults to 3 hours, independent of subject duration. */
    const DEFAULT_DAILY_WINDOW_MINUTES = 180;
    const dailyEnd =
      dto.daily_end_time ??
      this.minutesToTime(this.timeToMinutes(dailyStart) + DEFAULT_DAILY_WINDOW_MINUTES);
    const slotStart = this.timeToMinutes(dailyStart);
    const slotEnd = this.timeToMinutes(dailyEnd);

    const workingDates = await this.buildWorkingDates(
      schoolId,
      dto.academic_year_id,
      dto.start_date,
      dto.end_date,
    );
    const classNames = await this.repo.findClassNames(schoolId, dto.class_ids);
    const conflicts: AutoGenerateConflictDto[] = [];

    const mappingsByClass = new Map<
      string,
      Awaited<ReturnType<ClassSubjectTeacherService['findForClass']>>
    >();
    for (const classId of dto.class_ids) {
      const mappings = await this.classSubjectTeachers.findForClass(
        schoolId,
        dto.academic_year_id,
        classId,
      );
      if (mappings.length === 0) {
        conflicts.push({
          class_id: classId,
          class_name: classNames.get(classId) ?? classId,
          subject_name: '-',
          reason: 'NO_SUBJECT_MAPPING',
        });
        continue;
      }
      mappingsByClass.set(classId, mappings);
    }

    const allTeacherIds = [
      ...new Set([...mappingsByClass.values()].flatMap((list) => list.map((m) => m.teacher_id))),
    ];
    const existingBusy = await this.scheduleRepo.findInvigilatorBusySlots(
      schoolId,
      allTeacherIds,
      dto.start_date,
      dto.end_date,
    );
    const busyByTeacherDate = new Map<string, { start: number; end: number }[]>();
    for (const b of existingBusy) {
      if (!b.teacher_id) continue;
      const key = `${b.teacher_id}|${b.date}`;
      const list = busyByTeacherDate.get(key) ?? [];
      list.push({ start: this.timeToMinutes(b.start_time), end: this.timeToMinutes(b.end_time) });
      busyByTeacherDate.set(key, list);
    }

    const scheduleRows: NewExamSchedule[] = [];

    for (const [classId, mappings] of mappingsByClass) {
      // Pack this class's subjects sequentially within each day's window
      // (subjectDurationMinutes + breakMinutes apart), rolling over to the
      // next working day once the current day's window is exhausted.
      let dayIdx = 0;
      let cursor = slotStart;

      for (const mapping of mappings) {
        while (dayIdx < workingDates.length && cursor + subjectDurationMinutes > slotEnd) {
          dayIdx++;
          cursor = slotStart;
        }
        if (dayIdx >= workingDates.length) {
          conflicts.push({
            class_id: classId,
            class_name: classNames.get(classId) ?? classId,
            subject_name: mapping.subject_name,
            reason: 'NOT_ENOUGH_WORKING_DAYS',
          });
          continue;
        }
        const date = workingDates[dayIdx];
        const startMinutes = cursor;
        const endMinutes = cursor + subjectDurationMinutes;

        let invigilatorId: string | null = null;
        for (const candidate of allTeacherIds) {
          if (candidate === mapping.teacher_id) continue; // avoid conflict-of-interest
          const key = `${candidate}|${date}`;
          const busy = busyByTeacherDate.get(key) ?? [];
          const clash = busy.some((r) => startMinutes < r.end && endMinutes > r.start);
          if (!clash) {
            invigilatorId = candidate;
            break;
          }
        }
        if (!invigilatorId) {
          conflicts.push({
            class_id: classId,
            class_name: classNames.get(classId) ?? classId,
            subject_name: mapping.subject_name,
            exam_date: date,
            reason: 'NO_INVIGILATOR_AVAILABLE',
          });
        } else {
          const key = `${invigilatorId}|${date}`;
          const list = busyByTeacherDate.get(key) ?? [];
          list.push({ start: startMinutes, end: endMinutes });
          busyByTeacherDate.set(key, list);
        }

        scheduleRows.push({
          id: generateId(),
          school_id: schoolId,
          academic_year_id: dto.academic_year_id,
          class_id: classId,
          section_id: null,
          exam_id: '', // filled in by the caller once the exam id is known
          subject_id: mapping.subject_id,
          subject_name: mapping.subject_name,
          subject_type: SubjectType.MAIN_EXAM,
          exam_date: date,
          start_time: this.minutesToTime(startMinutes),
          end_time: this.minutesToTime(endMinutes),
          exam_marks: defaultMarks,
          passing_marks: defaultPassing,
          exam_invigilator_id: invigilatorId,
          hall_detail_id: null,
          sub_subject_enabled: false,
          parent_schedule_id: null,
          locked: false,
          is_enabled: true,
          deleted: false,
          created_by: createdBy,
        });

        cursor = endMinutes + breakMinutes;
      }
    }

    return { scheduleRows, conflicts };
  }

  async autoGenerate(
    dto: AutoGenerateExamDto,
    schoolId: string,
    createdBy: string,
  ): Promise<AutoGenerateExamResult> {
    const { scheduleRows, conflicts } = await this.buildProposedSchedule(dto, schoolId, createdBy);

    if (conflicts.length > 0) {
      throw new BadRequestException({
        message: `${conflicts.length} subject(s) could not be scheduled — widen the date range or adjust subject duration/break time and try again`,
        conflicts,
      });
    }

    await this.assertNoTimelineOverlap(
      schoolId,
      dto.academic_year_id,
      dto.class_ids,
      dto.start_date,
      dto.end_date,
    );

    const exam = await this.repo.create({
      id: generateId(),
      school_id: schoolId,
      academic_year_id: dto.academic_year_id,
      code: await this.deriveExamCode(schoolId, dto.academic_year_id, dto.exam_term, dto.start_date),
      exam_name: dto.exam_name,
      exam_term: dto.exam_term,
      start_date: dto.start_date,
      end_date: dto.end_date,
      include_in_marks: dto.include_in_marks ?? true,
      status: ExamStatus.DRAFT,
      is_published: false,
      is_enabled: true,
      created_by: createdBy,
    });
    await this.repo.replaceExamClasses(exam.id, schoolId, dto.academic_year_id, dto.class_ids);

    const rowsForExam = scheduleRows.map((r) => ({ ...r, exam_id: exam.id }));
    const schedules = rowsForExam.length > 0 ? await this.scheduleRepo.createMany(rowsForExam) : [];

    await this.redis.delByPattern(REDIS_EXAM_KEYS.EXAM.PATTERN(schoolId));
    await this.redis.delByPattern(REDIS_EXAM_KEYS.SCHEDULE.PATTERN(schoolId));

    return { exam: { ...exam, class_ids: dto.class_ids }, schedules, conflicts };
  }

  /**
   * Dry-run regeneration: computes what auto-generate WOULD produce for an
   * existing exam and diffs it against current schedule rows, without
   * writing anything. Rows with downstream data (attendance recorded) are
   * flagged so the caller can require `force` before overwriting them.
   */
  async regeneratePreview(
    examId: string,
    schoolId: string,
    dto: AutoGenerateExamDto,
    createdBy: string,
  ): Promise<{
    to_create: NewExamSchedule[];
    to_replace: { existing: ExamSchedule; proposed: NewExamSchedule; has_downstream_data: boolean }[];
    unchanged: ExamSchedule[];
    locked: ExamSchedule[];
    conflicts: AutoGenerateConflictDto[];
  }> {
    await this.findById(examId, schoolId); // 404s if not found
    const { scheduleRows: proposed, conflicts } = await this.buildProposedSchedule(
      dto,
      schoolId,
      createdBy,
    );
    const existingRows = (await this.scheduleRepo.findAllByExam(examId, schoolId)).filter(
      (r) => !r.parent_schedule_id,
    );
    const existingByKey = new Map(existingRows.map((r) => [`${r.class_id}__${r.subject_id}`, r]));
    const attendanceScheduleIds = await this.scheduleRepo.findScheduleIdsWithAttendance(
      existingRows.map((r) => r.id),
      schoolId,
    );

    const to_create: NewExamSchedule[] = [];
    const to_replace: {
      existing: ExamSchedule;
      proposed: NewExamSchedule;
      has_downstream_data: boolean;
    }[] = [];
    const unchanged: ExamSchedule[] = [];
    const locked: ExamSchedule[] = [];
    const matchedExistingIds = new Set<string>();

    for (const p of proposed) {
      const key = `${p.class_id}__${p.subject_id}`;
      const existing = existingByKey.get(key);
      if (!existing) {
        to_create.push(p);
        continue;
      }
      matchedExistingIds.add(existing.id);
      if (existing.locked) {
        locked.push(existing);
        continue;
      }
      const identical =
        existing.exam_date === p.exam_date &&
        existing.start_time === p.start_time &&
        existing.end_time === p.end_time &&
        existing.exam_invigilator_id === p.exam_invigilator_id;
      if (identical) {
        unchanged.push(existing);
      } else {
        to_replace.push({
          existing,
          proposed: { ...p, exam_id: examId },
          has_downstream_data: attendanceScheduleIds.has(existing.id),
        });
      }
    }
    // Existing rows the new proposal no longer covers (e.g. mapping removed) stay untouched —
    // regenerate only ever creates/replaces, never silently deletes.

    return { to_create, to_replace, unchanged, locked, conflicts };
  }

  /**
   * Applies a previously-previewed regeneration. `force` allows overwriting
   * rows that already have downstream data (attendance recorded).
   */
  async regenerateApply(
    examId: string,
    schoolId: string,
    dto: AutoGenerateExamDto,
    createdBy: string,
    force: boolean,
  ): Promise<AutoGenerateExamResult> {
    const exam = await this.findById(examId, schoolId);
    const preview = await this.regeneratePreview(examId, schoolId, dto, createdBy);

    if (preview.conflicts.length > 0) {
      throw new BadRequestException({
        message: `${preview.conflicts.length} subject(s) could not be scheduled — widen the date range or adjust subject duration/break time and try again`,
        conflicts: preview.conflicts,
      });
    }

    const blockedByDownstreamData = preview.to_replace.filter((r) => r.has_downstream_data && !force);
    if (blockedByDownstreamData.length > 0) {
      throw new BadRequestException({
        message: `${blockedByDownstreamData.length} schedule(s) already have attendance recorded — pass force=true to overwrite anyway`,
        schedule_ids: blockedByDownstreamData.map((r) => r.existing.id),
      });
    }

    const toCreateRows = preview.to_create.map((r) => ({ ...r, exam_id: examId }));
    const created = toCreateRows.length > 0 ? await this.scheduleRepo.createMany(toCreateRows) : [];

    const replaced: ExamSchedule[] = [];
    for (const r of preview.to_replace) {
      const updated = await this.scheduleRepo.update(r.existing.id, schoolId, {
        exam_date: r.proposed.exam_date,
        start_time: r.proposed.start_time,
        end_time: r.proposed.end_time,
        exam_invigilator_id: r.proposed.exam_invigilator_id,
      });
      replaced.push(updated);
    }

    await this.redis.delByPattern(REDIS_EXAM_KEYS.SCHEDULE.PATTERN(schoolId));

    return {
      exam,
      schedules: [...created, ...replaced],
      conflicts: preview.conflicts,
    };
  }
}
