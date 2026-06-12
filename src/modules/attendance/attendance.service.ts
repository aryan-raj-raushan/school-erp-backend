import { Injectable, NotFoundException } from '@nestjs/common';
import { AttendanceRepository } from './attendance.repository';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { PaginationResponse } from '../../shared/responses/api-response';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import {
  AttendanceFilterDto,
  StudentAttendanceFilterDto,
  DefaultersFilterDto,
} from './dto/attendance-filter.dto';
import {
  Attendance,
  MarkAttendanceResponse,
  DailyAttendanceReport,
  MonthlyAttendanceReport,
  DefaulterRecord,
  StudentAttendanceStats,
  StudentSummaryResponse,
} from './types/attendance.types';
import { CacheTTL } from '../../shared/constants';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly attendanceRepo: AttendanceRepository,
    private readonly redisService: RedisService,
  ) {}

  private cacheKey(schoolId: string) {
    return `attendance:${schoolId}`;
  }

  async findAll(
    schoolId: string,
    filters: AttendanceFilterDto,
  ): Promise<PaginationResponse<Attendance>> {
    const { page = 1, limit = 20 } = filters;
    const key = `${this.cacheKey(schoolId)}:list:${JSON.stringify(filters)}`;
    return this.redisService.getOrSet(key, CacheTTL.SHORT, async () => {
      const items = await this.attendanceRepo.findAll(schoolId, filters);
      return PaginationResponse.of(items, items.length, { page, limit });
    });
  }

  async findById(id: string, schoolId: string): Promise<Attendance> {
    const record = await this.attendanceRepo.findById(id, schoolId);
    if (!record) throw new NotFoundException(`Attendance record with id '${id}' not found`);
    return record;
  }

  async mark(
    dto: MarkAttendanceDto,
    schoolId: string,
    markedBy: string,
  ): Promise<MarkAttendanceResponse> {
    const results: Attendance[] = [];

    for (const entry of dto.entries) {
      const record = await this.attendanceRepo.upsert({
        id: generateId(),
        school_id: schoolId,
        student_id: entry.student_id,
        academic_year_id: dto.academic_year_id,
        class_section_id: dto.class_section_id,
        date: dto.date,
        status: entry.status as Attendance['status'],
        is_late: entry.is_late ?? false,
        remarks: entry.remarks,
        marked_by: markedBy,
      });
      results.push(record);
    }

    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);

    const present = results.filter((r) => r.status === 'PRESENT').length;
    const absent = results.filter((r) => r.status === 'ABSENT').length;
    const total = results.length;

    return {
      records: results,
      summary: {
        date: dto.date,
        totalStudents: total,
        present,
        absent,
        unmarked: 0,
        attendancePercent: total > 0 ? Math.round((present / total) * 100 * 100) / 100 : 0,
      },
    };
  }

  async update(id: string, schoolId: string, dto: UpdateAttendanceDto): Promise<Attendance> {
    await this.findById(id, schoolId);
    const updated = await this.attendanceRepo.update(id, schoolId, dto);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return updated;
  }

  async remove(id: string, schoolId: string): Promise<void> {
    await this.findById(id, schoolId);
    await this.attendanceRepo.remove(id, schoolId);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
  }

  async getDailyReport(
    schoolId: string,
    classSectionId: string,
    date: string,
  ): Promise<DailyAttendanceReport> {
    const key = `${this.cacheKey(schoolId)}:daily:${classSectionId}:${date}`;
    return this.redisService.getOrSet(key, CacheTTL.SHORT, async () => {
      const [records, class_section_name] = await Promise.all([
        this.attendanceRepo.getDailyReportEnriched(schoolId, classSectionId, date),
        this.attendanceRepo.getClassSectionName(classSectionId),
      ]);

      const present = records.filter((r) => r.status === 'PRESENT').length;
      const absent = records.filter((r) => r.status === 'ABSENT').length;
      const late = records.filter((r) => r.is_late).length;

      return {
        date,
        class_section_id: classSectionId,
        class_section_name,
        stats: { total: records.length, present, absent, late },
        records,
      };
    });
  }

  async getMonthlySummary(
    schoolId: string,
    classSectionId: string,
    year: number,
    month: number,
  ): Promise<MonthlyAttendanceReport> {
    const from_date = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to_date = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
    const key = `${this.cacheKey(schoolId)}:monthly:${classSectionId}:${year}-${month}`;

    return this.redisService.getOrSet(key, CacheTTL.SHORT, async () => {
      const [records, class_section_name] = await Promise.all([
        this.attendanceRepo.getMonthlyReportEnriched(schoolId, classSectionId, from_date, to_date),
        this.attendanceRepo.getClassSectionName(classSectionId),
      ]);

      const present = records.filter((r) => r.status === 'PRESENT').length;
      const absent = records.filter((r) => r.status === 'ABSENT').length;
      const late = records.filter((r) => r.is_late).length;

      // Aggregate per-student
      const studentMap = new Map<
        string,
        {
          student_id: string;
          student_name: string;
          roll_number?: string | null;
          admission_number?: string;
          present: number;
          absent: number;
          total: number;
        }
      >();
      for (const r of records) {
        if (!studentMap.has(r.student_id)) {
          studentMap.set(r.student_id, {
            student_id: r.student_id,
            student_name: r.student_name,
            // roll_number: r.roll_number,
            // admission_number: r.admission_number,
            present: 0,
            absent: 0,
            total: 0,
          });
        }
        const s = studentMap.get(r.student_id)!;
        s.total++;
        if (r.status === 'PRESENT') s.present++;
        if (r.status === 'ABSENT') s.absent++;
      }

      const student_summaries = Array.from(studentMap.values()).map((s) => ({
        ...s,
        total_days: s.total,
        percentage: s.total > 0 ? Math.round((s.present / s.total) * 100 * 100) / 100 : 0,
      }));

      const uniqueStudents = new Set(records.map((r) => r.student_id)).size;

      return {
        class_section_id: classSectionId,
        class_section_name,
        year,
        month,
        stats: { total_students: uniqueStudents, total: records.length, present, absent, late },
        student_summaries,
        records,
      };
    });
  }

  async getDefaulters(schoolId: string, filters: DefaultersFilterDto): Promise<DefaulterRecord[]> {
    return this.attendanceRepo.getDefaulters(
      schoolId,
      filters.class_section_id,
      filters.academic_year_id,
      filters.threshold,
    );
  }

  async enqueueExport(schoolId: string, filters: AttendanceFilterDto): Promise<{ jobId: string }> {
    const jobId = generateId();
    const jobKey = `export_job:attendance:${jobId}`;
    await this.redisService.setex(
      jobKey,
      86400,
      JSON.stringify({ jobId, status: 'PENDING', schoolId, filters }),
    );
    return { jobId };
  }

  async getStudentHistory(
    studentId: string,
    schoolId: string,
    filters: StudentAttendanceFilterDto,
  ): Promise<PaginationResponse<Attendance> & { stats: StudentAttendanceStats }> {
    const { page = 1, limit = 20 } = filters;
    const key = `${this.cacheKey(schoolId)}:student:${studentId}:${JSON.stringify(filters)}`;
    return this.redisService.getOrSet(key, CacheTTL.SHORT, async () => {
      const [items, total, stats] = await Promise.all([
        this.attendanceRepo.getStudentHistory(studentId, schoolId, filters),
        this.attendanceRepo.getStudentHistoryCount(studentId, schoolId, filters),
        this.attendanceRepo.getStudentStats(studentId, schoolId, filters.academic_year_id),
      ]);
      return { ...PaginationResponse.of(items, total, { page, limit }), stats };
    });
  }

  async getStudentSummary(
    studentId: string,
    schoolId: string,
    academicYearId?: string,
  ): Promise<StudentSummaryResponse> {
    const key = `${this.cacheKey(schoolId)}:summary:${studentId}:${academicYearId}`;
    return this.redisService.getOrSet(key, CacheTTL.SHORT, async () => {
      const [stats, monthlyBreakdown] = await Promise.all([
        this.attendanceRepo.getStudentStats(studentId, schoolId, academicYearId),
        this.attendanceRepo.getStudentMonthlySummary(studentId, schoolId, academicYearId),
      ]);

      const fromDate =
        monthlyBreakdown.length > 0
          ? `${monthlyBreakdown[0].year}-${String(monthlyBreakdown[0].month).padStart(2, '0')}-01`
          : null;
      const last = monthlyBreakdown[monthlyBreakdown.length - 1];
      const toDate = last
        ? `${last.year}-${String(last.month).padStart(2, '0')}-${new Date(last.year, last.month, 0).getDate()}`
        : null;

      return {
        totalPresent: stats.present,
        totalAbsent: stats.absent,
        totalDays: stats.total_days,
        attendancePercent: stats.attendance_percentage,
        fromDate,
        toDate,
        monthlyBreakdown,
      };
    });
  }

  async getSectionAttendance(
    schoolId: string,
    classSectionId: string,
    from_date: string,
    to_date: string,
  ): Promise<Attendance[]> {
    return this.attendanceRepo.getSectionByDateRange(schoolId, classSectionId, from_date, to_date);
  }

  async getSectionAttendanceByDate(
    schoolId: string,
    classSectionId: string,
    date: string,
  ): Promise<Attendance[]> {
    return this.attendanceRepo.getDailyReport(schoolId, classSectionId, date);
  }
}
