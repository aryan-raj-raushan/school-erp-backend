import { Injectable, NotFoundException } from '@nestjs/common';
import { StaffShiftsRepository } from './staff-shifts.repository';
import { generateId } from '../../utils/uuid.utils';
import { CreateStaffShiftDto, UpdateStaffShiftDto } from './dto/staff-shifts.dto';
import { StaffShift } from './types/staff-shifts.types';

@Injectable()
export class StaffShiftsService {
  constructor(private readonly repo: StaffShiftsRepository) {}

  async list(schoolId: string): Promise<StaffShift[]> {
    return this.repo.findAll(schoolId);
  }

  async listByStaff(staffId: string, schoolId: string): Promise<StaffShift[]> {
    return this.repo.findByStaff(staffId, schoolId);
  }

  async getActiveShift(staffId: string, schoolId: string, date: string): Promise<StaffShift | null> {
    return (await this.repo.findActiveForStaff(staffId, schoolId, date)) ?? null;
  }

  async create(schoolId: string, dto: CreateStaffShiftDto): Promise<StaffShift> {
    return this.repo.create({
      id: generateId(),
      school_id: schoolId,
      staff_id: dto.staff_id,
      shift_name: dto.shift_name,
      shift_type: dto.shift_type,
      shift_start: dto.shift_start,
      shift_end: dto.shift_end,
      grace_period_minutes: String(dto.grace_period_minutes ?? 10),
      working_days: dto.working_days ?? 'MON,TUE,WED,THU,FRI',
      effective_from: dto.effective_from,
      effective_to: dto.effective_to,
      is_active: 'true',
    });
  }

  async update(id: string, schoolId: string, dto: UpdateStaffShiftDto): Promise<StaffShift> {
    const existing = await this.repo.findById(id, schoolId);
    if (!existing) throw new NotFoundException(`Staff shift '${id}' not found`);
    return this.repo.update(id, schoolId, {
      ...(dto.shift_name && { shift_name: dto.shift_name }),
      ...(dto.shift_type && { shift_type: dto.shift_type }),
      ...(dto.shift_start && { shift_start: dto.shift_start }),
      ...(dto.shift_end && { shift_end: dto.shift_end }),
      ...(dto.grace_period_minutes !== undefined && { grace_period_minutes: String(dto.grace_period_minutes) }),
      ...(dto.working_days && { working_days: dto.working_days }),
      ...(dto.effective_from && { effective_from: dto.effective_from }),
      ...(dto.effective_to && { effective_to: dto.effective_to }),
      ...(dto.is_active !== undefined && { is_active: dto.is_active }),
    });
  }

  async delete(id: string, schoolId: string): Promise<void> {
    const existing = await this.repo.findById(id, schoolId);
    if (!existing) throw new NotFoundException(`Staff shift '${id}' not found`);
    await this.repo.delete(id, schoolId);
  }
}
