import { Injectable, ForbiddenException } from '@nestjs/common';
import { StudentsRepository } from '../students/students.repository';
import { StudentsService } from '../students/students.service';
import { AttendanceService } from '../attendance/attendance.service';
import { StudentAttendanceFilterDto } from '../attendance/dto/attendance-filter.dto';
import { FeesService } from '../fees/fees.service';
import { AcademicsService } from '../academics/academics.service';
import { ExamScheduleService } from '../exam/exam-schedule/exam-schedule.service';
import { FilterExamScheduleDto } from '../exam/exam-schedule/dto/exam-schedule.dto';
import { ExamResultsService } from '../results/exam-results.service';
import { FilterReportCardDto } from '../results/dto/exam-result.dto';
import { TimetableService } from '../timetable/timetable.service';
import { GatePassesService } from '../gate-passes/gate-passes.service';
import { StudentMovementsService } from '../student-movements/student-movements.service';
import { RedisService } from '../redis/redis.service';
import { CacheTTL } from '../../shared/constants';
import { StudentAcademicInfo } from '../students/types/student.types';

// JS Date#getDay() is 0 = Sunday ... 6 = Saturday — matches the `day_of_week` pg enum ordering.
const WEEKDAYS = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const;

@Injectable()
export class ParentPortalService {
  constructor(
    private readonly studentsRepo: StudentsRepository,
    private readonly studentsService: StudentsService,
    private readonly attendanceService: AttendanceService,
    private readonly feesService: FeesService,
    private readonly academicsService: AcademicsService,
    private readonly examScheduleService: ExamScheduleService,
    private readonly examResultsService: ExamResultsService,
    private readonly timetableService: TimetableService,
    private readonly gatePassesService: GatePassesService,
    private readonly studentMovementsService: StudentMovementsService,
    private readonly redisService: RedisService,
  ) {}

  private cacheKey(schoolId: string, studentId: string, suffix: string): string {
    return `parent-portal:${schoolId}:${studentId}:${suffix}`;
  }

  /** Resolves the student's current class/section/academic-year once per request. */
  private async resolveAcademicInfo(
    studentId: string,
    schoolId: string,
  ): Promise<StudentAcademicInfo> {
    const info = await this.studentsRepo.findCurrentAcademicInfo(studentId, schoolId);
    if (!info) {
      throw new ForbiddenException('No current class enrollment found for this student');
    }
    return info;
  }

  // ─── Attendance ──────────────────────────────────────────────────────────────

  async getAttendanceSummary(studentId: string, schoolId: string) {
    const info = await this.resolveAcademicInfo(studentId, schoolId);
    return this.attendanceService.getStudentSummary(studentId, schoolId, info.academic_year_id);
  }

  async getAttendanceHistory(
    studentId: string,
    schoolId: string,
    filters: StudentAttendanceFilterDto,
  ) {
    return this.attendanceService.getStudentHistory(studentId, schoolId, filters);
  }

  // ─── Fees ────────────────────────────────────────────────────────────────────

  async getFeeBills(studentId: string, schoolId: string) {
    const info = await this.resolveAcademicInfo(studentId, schoolId);
    return this.feesService.findStudentBills(studentId, schoolId, info.academic_year_id);
  }

  // ─── Homework ────────────────────────────────────────────────────────────────

  async getHomework(studentId: string, schoolId: string) {
    const info = await this.resolveAcademicInfo(studentId, schoolId);
    const key = this.cacheKey(schoolId, studentId, 'homework');
    return this.redisService.getOrSet(key, CacheTTL.SHORT, async () => {
      const list = await this.academicsService.findAllHomework(schoolId, {
        class_id: info.class_id,
      });
      // N+1 (one getStudentSubmission call per homework item) — acceptable at typical
      // per-class homework volume; a future batch-query optimization if that changes.
      return Promise.all(
        list.map(async (homework) => ({
          ...homework,
          submission: await this.academicsService.getStudentSubmission(
            homework.id,
            studentId,
            schoolId,
          ),
        })),
      );
    });
  }

  // ─── Timetable ───────────────────────────────────────────────────────────────

  async getTimetableToday(studentId: string, schoolId: string) {
    const info = await this.resolveAcademicInfo(studentId, schoolId);
    const day = WEEKDAYS[new Date().getDay()];
    const key = this.cacheKey(schoolId, studentId, `timetable:today:${day}`);
    return this.redisService.getOrSet(key, CacheTTL.SHORT, () =>
      this.timetableService.getSessionView(schoolId, {
        day,
        academic_year_id: info.academic_year_id,
        class_id: info.class_id,
      }),
    );
  }

  async getTimetableWeek(studentId: string, schoolId: string) {
    const info = await this.resolveAcademicInfo(studentId, schoolId);
    const key = this.cacheKey(schoolId, studentId, 'timetable:week');
    return this.redisService.getOrSet(key, CacheTTL.SHORT, () =>
      this.timetableService.findAll(schoolId, {
        academic_year_id: info.academic_year_id,
        class_id: info.class_id,
      }),
    );
  }

  // ─── Exams ───────────────────────────────────────────────────────────────────

  async getUpcomingExamSchedule(studentId: string, schoolId: string) {
    const info = await this.resolveAcademicInfo(studentId, schoolId);
    const key = this.cacheKey(schoolId, studentId, 'exams:schedule');
    return this.redisService.getOrSet(key, CacheTTL.SHORT, async () => {
      const result = await this.examScheduleService.findAll(schoolId, {
        class_id: info.class_id,
        academic_year_id: info.academic_year_id,
        page: 1,
        limit: 200,
      } as FilterExamScheduleDto);
      const today = new Date().toISOString().split('T')[0];
      // No date-range filter exists upstream (FilterExamScheduleDto only supports an exact
      // exam_date) — post-filter to "upcoming" here rather than modifying the shared DTO.
      return result.items.filter((s) => s.exam_date >= today);
    });
  }

  // ─── Results ─────────────────────────────────────────────────────────────────

  async getReportCards(studentId: string, schoolId: string) {
    const key = this.cacheKey(schoolId, studentId, 'results:report-cards');
    return this.redisService.getOrSet(key, CacheTTL.SHORT, async () => {
      const result = await this.examResultsService.findReportCards(schoolId, {
        student_id: studentId,
        page: 1,
        limit: 100,
      } as FilterReportCardDto);
      // CONFIRMED GAP upstream: findReportCards doesn't filter is_published — a parent must
      // never see an unpublished report card, so filter here before returning.
      return { ...result, items: result.items.filter((r) => r.is_published) };
    });
  }

  // ─── Gate passes / movements ─────────────────────────────────────────────────

  async getGatePasses(studentId: string, schoolId: string) {
    return this.gatePassesService.findAll(schoolId, undefined, undefined, studentId);
  }

  async getMovements(studentId: string, schoolId: string) {
    return this.studentMovementsService.findByStudent(studentId, schoolId);
  }

  // ─── Profile ─────────────────────────────────────────────────────────────────

  async getProfile(studentId: string, schoolId: string) {
    const [pickupCard, guardians] = await Promise.all([
      this.studentsService.getPickupCardData(studentId, schoolId),
      this.studentsService.findAllGuardians(schoolId, undefined, studentId),
    ]);
    return { ...pickupCard, guardians };
  }
}
