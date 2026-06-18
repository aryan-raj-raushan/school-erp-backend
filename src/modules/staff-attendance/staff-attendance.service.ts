import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RedisService } from '../redis/redis.service';
import { CacheTTL } from '../../shared/constants';
import { StaffAttendanceRepository } from './staff-attendance.repository';
import { MarkStaffAttendanceDto } from './dto/staff-attendance.dto';

@Injectable()
export class StaffAttendanceService {
  constructor(
    private readonly repo: StaffAttendanceRepository,
    private readonly redisService: RedisService,
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

  async mark(dto: MarkStaffAttendanceDto, schoolId: string, markedBy: string) {
    const results = [];
    for (const entry of dto.entries) {
      const row = await this.repo.upsert({
        id: randomUUID(),
        school_id: schoolId,
        staff_id: entry.staff_id,
        date: dto.date,
        status: entry.status as 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED',
        is_late: entry.is_late ?? false,
        remarks: entry.remarks,
        marked_by: markedBy,
      });
      results.push(row);
    }
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return results;
  }
}
