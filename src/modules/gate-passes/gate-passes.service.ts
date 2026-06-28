import { Injectable, NotFoundException } from '@nestjs/common';
import { GatePassesRepository } from './gate-passes.repository';
import { generateId } from '../../utils/uuid.utils';
import { CreateGatePassDto } from './dto/gate-passes.dto';

@Injectable()
export class GatePassesService {
  constructor(private readonly repo: GatePassesRepository) {}

  async findAll(schoolId: string, date?: string, status?: string) {
    return this.repo.findAll(schoolId, date, status);
  }

  async create(dto: CreateGatePassDto, schoolId: string, createdBy: string) {
    const qrCode = generateId();
    return this.repo.create({
      id: generateId(),
      school_id: schoolId,
      student_id: dto.student_id,
      date: dto.date,
      reason: dto.reason,
      exit_time: dto.exit_time,
      return_time: dto.return_time,
      qr_code: qrCode,
      status: 'PENDING',
      parent_consent_required: dto.parent_consent_required ?? false,
      created_by: createdBy,
      deleted: false,
    });
  }

  async approve(id: string, schoolId: string, approvedBy: string) {
    const record = await this.repo.findById(id, schoolId);
    if (!record) throw new NotFoundException(`Gate pass '${id}' not found`);
    return this.repo.updateStatus(id, schoolId, {
      status: 'APPROVED',
      approved_by: approvedBy,
      approved_at: new Date(),
    });
  }

  async use(qrCode: string) {
    const record = await this.repo.findByQr(qrCode);
    if (!record) throw new NotFoundException('Gate pass not found');
    return this.repo.updateStatus(record.id, record.school_id, {
      status: 'USED',
      used_at: new Date(),
    });
  }

  async reject(id: string, schoolId: string) {
    const record = await this.repo.findById(id, schoolId);
    if (!record) throw new NotFoundException(`Gate pass '${id}' not found`);
    return this.repo.updateStatus(id, schoolId, { status: 'REJECTED' });
  }

  async remove(id: string, schoolId: string) {
    const record = await this.repo.findById(id, schoolId);
    if (!record) throw new NotFoundException(`Gate pass '${id}' not found`);
    await this.repo.softDelete(id, schoolId);
  }
}
