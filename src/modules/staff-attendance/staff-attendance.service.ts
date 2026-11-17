import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { randomUUID } from 'crypto';
import { RedisService } from '../redis/redis.service';
import { CacheTTL } from '../../shared/constants';
import { StaffAttendanceRepository } from './staff-attendance.repository';
import {
  MarkStaffAttendanceDto,
  StaffAttendanceExportDto,
  StaffAttendanceRangeDto,
  StaffPunchInDto,
} from './dto/staff-attendance.dto';
import { AttendanceEngineService } from '../attendance/attendance-engine.service';
import { attendanceLockReason } from '../attendance/attendance-lock';
import { DateUtils } from '../../utils/date.utils';

const MAX_RANGE_DAYS = 366;

@Injectable()
export class StaffAttendanceService {
  constructor(
    private readonly repo: StaffAttendanceRepository,
    private readonly redisService: RedisService,
    private readonly engine: AttendanceEngineService,
  ) {}

  private cacheKey(schoolId: string) {
    return `staff-attendance:${schoolId}`;
  }

  async getStaff(schoolId: string) {
    const key = `${this.cacheKey(schoolId)}:staff-list`;
    return this.redisService.getOrSet(key, CacheTTL.MEDIUM, () => this.repo.findAllStaff(schoolId));
  }

  async getByDate(schoolId: string, date: string) {
    const key = `${this.cacheKey(schoolId)}:date:${date}`;
    return this.redisService.getOrSet(key, CacheTTL.SHORT, () =>
      this.repo.findByDate(schoolId, date),
    );
  }

  async getByRange(schoolId: string, dto: StaffAttendanceRangeDto) {
    StaffAttendanceService.assertValidRange(dto);
    const key = `${this.cacheKey(schoolId)}:range:${dto.start_date}:${dto.end_date}:${dto.role ?? ''}`;
    return this.redisService.getOrSet(key, CacheTTL.SHORT, () =>
      this.repo.findByRange(schoolId, dto.start_date, dto.end_date, dto.role),
    );
  }

  async generateExport(
    schoolId: string,
    dto: StaffAttendanceExportDto,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    StaffAttendanceService.assertValidRange(dto);
    const records = await this.repo.findByRange(schoolId, dto.start_date, dto.end_date, dto.role);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Staff Attendance');
    sheet.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Employee Code', key: 'employee_code', width: 16 },
      { header: 'Staff Name', key: 'staff_name', width: 26 },
      { header: 'Role', key: 'role', width: 16 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Mode', key: 'mode', width: 10 },
      { header: 'Marked At', key: 'marked_at', width: 20 },
      { header: 'Late?', key: 'is_late', width: 8 },
      { header: 'Remarks', key: 'remarks', width: 32 },
    ];
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE9ECEF' } };

    for (const r of records) {
      sheet.addRow({
        date: r.date,
        employee_code: r.employee_code ?? '',
        staff_name: [r.staff_first_name, r.staff_last_name].filter(Boolean).join(' '),
        role: r.staff_role ?? '',
        status: r.status,
        mode: r.mode,
        marked_at: r.marked_at ? new Date(r.marked_at).toISOString() : '',
        is_late: r.is_late ? 'Yes' : 'No',
        remarks: r.remarks ?? '',
      });
    }

    const basename = `staff_attendance_${dto.start_date}_to_${dto.end_date}`;
    if (dto.format === 'csv') {
      return {
        buffer: Buffer.from(await workbook.csv.writeBuffer()),
        filename: `${basename}.csv`,
        contentType: 'text/csv',
      };
    }
    return {
      buffer: Buffer.from(await workbook.xlsx.writeBuffer()),
      filename: `${basename}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  private static assertValidRange(dto: StaffAttendanceRangeDto): void {
    const start = new Date(dto.start_date);
    const end = new Date(dto.end_date);
    if (end < start) throw new BadRequestException('end_date must be on or after start_date');
    if ((end.getTime() - start.getTime()) / 86_400_000 > MAX_RANGE_DAYS) {
      throw new BadRequestException(`Date range cannot exceed ${MAX_RANGE_DAYS} days`);
    }
  }

  async mark(dto: MarkStaffAttendanceDto, schoolId: string, markedBy: string) {
    const existing = await this.repo.findLockCandidates(
      schoolId,
      dto.entries.map((e) => e.staff_id),
      dto.date,
    );
    const today = DateUtils.zonedDateTime(
      new Date(),
      await this.repo.findSchoolTimezone(schoolId),
    ).date;
    const results = [];
    const locked: { staff_id: string; reason: string }[] = [];
    for (const entry of dto.entries) {
      const current = existing.find((r) => r.staff_id === entry.staff_id);
      const lockReason = current ? attendanceLockReason(current, today) : null;
      if (lockReason) {
        locked.push({ staff_id: entry.staff_id, reason: lockReason });
        continue;
      }
      const row = await this.repo.upsert({
        id: randomUUID(),
        school_id: schoolId,
        staff_id: entry.staff_id,
        date: dto.date,
        status: entry.status as 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED',
        is_late: entry.is_late ?? false,
        remarks: entry.remarks,
        marked_by: markedBy,
        mode: 'MANUAL',
        marked_at: new Date(),
      });
      results.push(row);
    }
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return { records: results, locked };
  }

  async getMyToday(schoolId: string, staffId: string) {
    const { date } = DateUtils.zonedDateTime(
      new Date(),
      await this.repo.findSchoolTimezone(schoolId),
    );
    return (await this.repo.findOne(schoolId, staffId, date)) ?? null;
  }

  async punchIn(schoolId: string, staffId: string, dto: StaffPunchInDto) {
    const now = new Date();
    const { date, time } = DateUtils.zonedDateTime(
      now,
      await this.repo.findSchoolTimezone(schoolId),
    );
    const existing = await this.repo.findOne(schoolId, staffId, date);
    if (existing) {
      const at = existing.marked_at
        ? ` at ${DateUtils.zonedDateTime(new Date(existing.marked_at)).time}`
        : '';
      throw new ConflictException(
        `Your attendance for today is already marked${at} (${existing.mode === 'APP' ? 'app' : existing.mode.toLowerCase()})`,
      );
    }

    const result = await this.engine.resolve({
      schoolId,
      personId: staffId,
      personType: 'STAFF',
      date,
      tapTime: time,
      source: 'MANUAL',
    });
    if (result.status === 'HOLIDAY')
      throw new BadRequestException('Today is a holiday — no punch-in needed');
    if (result.status === 'LEAVE') throw new BadRequestException('You are on approved leave today');

    const row = await this.repo.insertPunch({
      id: randomUUID(),
      school_id: schoolId,
      staff_id: staffId,
      date,
      status: (result.status === 'SKIP' ? 'PRESENT' : result.status) as
        | 'PRESENT'
        | 'LATE'
        | 'HALF_DAY',
      is_late: result.isLate,
      marked_by: staffId,
      mode: 'APP',
      marked_at: now,
      latitude: dto.latitude.toFixed(6),
      longitude: dto.longitude.toFixed(6),
      location_accuracy_m: dto.accuracy != null ? Math.round(dto.accuracy) : null,
    });
    if (!row) throw new ConflictException('Your attendance for today is already marked');
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return row;
  }
}
