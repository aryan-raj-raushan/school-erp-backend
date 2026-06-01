import { Injectable, NotFoundException } from '@nestjs/common';
import { AttendanceRepository } from './attendance.repository';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { PaginationResponse } from '../../shared/responses/api-response';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { AttendanceFilterDto, StudentAttendanceFilterDto, DefaultersFilterDto } from './dto/attendance-filter.dto';
import { Attendance } from './types/attendance.types';

const CACHE_TTL = 60;

@Injectable()
export class AttendanceService {
  constructor(
    private readonly attendanceRepo: AttendanceRepository,
    private readonly redisService: RedisService,
  ) {}

  private cacheKey(schoolId: string) {
    return `attendance:${schoolId}`;
  }

  async findAll(schoolId: string, filters: AttendanceFilterDto): Promise<PaginationResponse<Attendance>> {
    const { page = 1, limit = 20 } = filters;
    const key = `${this.cacheKey(schoolId)}:list:${JSON.stringify(filters)}`;
    return this.redisService.getOrSet(key, CACHE_TTL, async () => {
      const items = await this.attendanceRepo.findAll(schoolId, filters);
      return PaginationResponse.of(items, items.length, { page, limit });
    });
  }

  async findById(id: string, schoolId: string): Promise<Attendance> {
    const record = await this.attendanceRepo.findById(id, schoolId);
    if (!record) throw new NotFoundException(`Attendance record with id '${id}' not found`);
    return record;
  }

  async mark(dto: MarkAttendanceDto, schoolId: string, markedBy: string): Promise<Attendance[]> {
    const results: Attendance[] = [];

    for (const entry of dto.entries) {
      const record = await this.attendanceRepo.upsert({
        id: generateId(),
        school_id: schoolId,
        student_id: entry.student_id,
        academic_year_id: dto.academic_year_id,
        class_section_id: dto.class_section_id,
        date: dto.date,
        status: entry.status,
        remarks: entry.remarks,
        marked_by: markedBy,
      });
      results.push(record);
    }

    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return results;
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

  async getDailyReport(schoolId: string, classSectionId: string, date: string): Promise<Attendance[]> {
    const key = `${this.cacheKey(schoolId)}:daily:${classSectionId}:${date}`;
    return this.redisService.getOrSet(key, CACHE_TTL, () =>
      this.attendanceRepo.getDailyReport(schoolId, classSectionId, date),
    );
  }

  async getMonthlySummary(schoolId: string, classSectionId: string, year: number, month: number) {
    const from_date = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to_date = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
    const key = `${this.cacheKey(schoolId)}:monthly:${classSectionId}:${year}-${month}`;
    return this.redisService.getOrSet(key, CACHE_TTL, () =>
      this.attendanceRepo.getSectionByDateRange(schoolId, classSectionId, from_date, to_date),
    );
  }

  async getDefaulters(schoolId: string, filters: DefaultersFilterDto) {
    return this.attendanceRepo.getDefaulters(schoolId, filters.class_section_id, filters.academic_year_id, filters.threshold);
  }

  async enqueueExport(schoolId: string, filters: AttendanceFilterDto): Promise<{ jobId: string }> {
    const jobId = generateId();
    const jobKey = `export_job:attendance:${jobId}`;
    await this.redisService.setex(jobKey, 86400, JSON.stringify({ jobId, status: 'PENDING', schoolId, filters }));
    return { jobId };
  }

  async getStudentHistory(studentId: string, schoolId: string, filters: StudentAttendanceFilterDto): Promise<PaginationResponse<Attendance>> {
    const { page = 1, limit = 20 } = filters;
    const key = `${this.cacheKey(schoolId)}:student:${studentId}:${JSON.stringify(filters)}`;
    return this.redisService.getOrSet(key, CACHE_TTL, async () => {
      const [items, total] = await Promise.all([
        this.attendanceRepo.getStudentHistory(studentId, schoolId, filters),
        this.attendanceRepo.getStudentHistoryCount(studentId, schoolId, filters),
      ]);
      return PaginationResponse.of(items, total, { page, limit });
    });
  }

  async getStudentSummary(studentId: string, schoolId: string, academicYearId?: string) {
    const key = `${this.cacheKey(schoolId)}:summary:${studentId}:${academicYearId}`;
    return this.redisService.getOrSet(key, CACHE_TTL, () =>
      this.attendanceRepo.getStudentSummary(studentId, schoolId, academicYearId),
    );
  }

  async getSectionAttendance(schoolId: string, classSectionId: string, from_date: string, to_date: string): Promise<Attendance[]> {
    return this.attendanceRepo.getSectionByDateRange(schoolId, classSectionId, from_date, to_date);
  }

  async getSectionAttendanceByDate(schoolId: string, classSectionId: string, date: string): Promise<Attendance[]> {
    return this.attendanceRepo.getDailyReport(schoolId, classSectionId, date);
  }
}
