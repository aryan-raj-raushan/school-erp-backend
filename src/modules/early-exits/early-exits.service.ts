import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { EarlyExitsRepository } from './early-exits.repository';
import { generateId } from '../../utils/uuid.utils';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { eq, and } from 'drizzle-orm';
import { attendances } from '../../database/drizzle/schema/attendance.schema';
import { CreateEarlyExitDto } from './dto/early-exits.dto';

@Injectable()
export class EarlyExitsService {
  constructor(
    private readonly repo: EarlyExitsRepository,
    @Inject(DRIZZLE_ORM) private readonly db: DrizzleDB,
  ) {}

  async findAll(schoolId: string, date?: string) {
    return this.repo.findAll(schoolId, date);
  }

  async create(dto: CreateEarlyExitDto, schoolId: string, createdBy: string) {
    return this.repo.create({
      id: generateId(),
      school_id: schoolId,
      student_id: dto.student_id,
      date: dto.date,
      exit_time: dto.exit_time,
      reason: dto.reason,
      remarks: dto.remarks,
      status: 'PENDING',
      created_by: createdBy,
      deleted: false,
    });
  }

  async approve(id: string, schoolId: string, approvedBy: string, halfDayCutoff = '12:00') {
    const record = await this.repo.findById(id, schoolId);
    if (!record) throw new NotFoundException(`Early exit '${id}' not found`);

    const approved = await this.repo.approve(id, schoolId, approvedBy);

    // If exit before half-day cutoff, downgrade attendance to HALF_DAY
    if (approved.exit_time < halfDayCutoff) {
      await this.db
        .update(attendances)
        .set({ status: 'HALF_DAY' })
        .where(and(eq(attendances.student_id, record.student_id), eq(attendances.date, record.date), eq(attendances.school_id, schoolId)));
    }

    return approved;
  }

  async reject(id: string, schoolId: string) {
    const record = await this.repo.findById(id, schoolId);
    if (!record) throw new NotFoundException(`Early exit '${id}' not found`);
    return this.repo.reject(id, schoolId);
  }

  async remove(id: string, schoolId: string) {
    const record = await this.repo.findById(id, schoolId);
    if (!record) throw new NotFoundException(`Early exit '${id}' not found`);
    await this.repo.softDelete(id, schoolId);
  }
}
