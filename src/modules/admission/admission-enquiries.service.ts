import { Injectable, NotFoundException } from '@nestjs/common';
import { AdmissionEnquiriesRepository } from './admission-enquiries.repository';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { PaginationResponse } from '../../shared/responses/api-response';
import { CreateAdmissionEnquiryDto } from './dto/create-admission-enquiry.dto';
import { UpdateAdmissionEnquiryDto, EnquiryStatus } from './dto/update-admission-enquiry.dto';
import { FilterAdmissionEnquiryDto } from './dto/filter-admission-enquiry.dto';
import { AdmissionEnquiry, EnquiryHistory } from './types/admission-enquiry.types';

const LIST_TTL = 60;
const ITEM_TTL = 180;

@Injectable()
export class AdmissionEnquiriesService {
  constructor(
    private readonly enquiriesRepo: AdmissionEnquiriesRepository,
    private readonly redisService: RedisService,
  ) {}

  private cacheKey(schoolId: string) {
    return `admission_enquiries:${schoolId}`;
  }

  async findAll(schoolId: string, filters: FilterAdmissionEnquiryDto): Promise<PaginationResponse<AdmissionEnquiry>> {
    const key = `${this.cacheKey(schoolId)}:list:${JSON.stringify(filters)}`;
    return this.redisService.getOrSet(key, LIST_TTL, async () => {
      const [items, total] = await Promise.all([
        this.enquiriesRepo.findAll(schoolId, filters),
        this.enquiriesRepo.count(schoolId, filters),
      ]);
      return PaginationResponse.of(items, total, filters);
    });
  }

  async findById(id: string, schoolId: string): Promise<AdmissionEnquiry> {
    const key = `${this.cacheKey(schoolId)}:${id}`;
    return this.redisService.getOrSet(key, ITEM_TTL, async () => {
      const enquiry = await this.enquiriesRepo.findById(id, schoolId);
      if (!enquiry) throw new NotFoundException(`Admission enquiry with id '${id}' not found`);
      return enquiry;
    });
  }

  async create(dto: CreateAdmissionEnquiryDto, schoolId: string, createdBy: string): Promise<AdmissionEnquiry> {
    const enquiry = await this.enquiriesRepo.create({
      id: generateId(),
      school_id: schoolId,
      created_by: createdBy,
      status: 'NEW',
      ...dto,
    });

    // Auto-create first history entry
    await this.enquiriesRepo.createHistory({
      id: generateId(),
      school_id: schoolId,
      enquiry_id: enquiry.id,
      assigned_teacher_id: dto.assigned_teacher_id ?? null,
      action: 'NEW_ENQUIRY',
      details: `Enquiry created for student: ${dto.student_name}`,
      remarks: dto.remarks,
      created_by: createdBy,
    });

    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:list:*`);
    return enquiry;
  }

  async update(id: string, schoolId: string, dto: UpdateAdmissionEnquiryDto, updatedBy: string): Promise<AdmissionEnquiry> {
    const existing = await this.findById(id, schoolId);
    const updated = await this.enquiriesRepo.update(id, schoolId, dto);

    // Determine history action from what changed
    let action: 'FOLLOW_UP_UPDATED' | 'ADMISSION_CONFIRMED' | 'ENQUIRY_REJECTED' | 'REMARKS_UPDATED' | 'TEACHER_ASSIGNED' = 'REMARKS_UPDATED';
    let details = 'Enquiry updated';

    if (dto.status === EnquiryStatus.ADMISSION_CONFIRMED) {
      action = 'ADMISSION_CONFIRMED';
      details = 'Admission has been confirmed';
    } else if (dto.status === EnquiryStatus.REJECTED) {
      action = 'ENQUIRY_REJECTED';
      details = 'Enquiry has been rejected';
    } else if (dto.next_followup_date || dto.next_followup_time) {
      action = 'FOLLOW_UP_UPDATED';
      details = `Follow-up scheduled for ${dto.next_followup_date ?? existing.next_followup_date}`;
    } else if (dto.assigned_teacher_id && dto.assigned_teacher_id !== existing.assigned_teacher_id) {
      action = 'TEACHER_ASSIGNED';
      details = 'Assigned teacher has been updated';
    }

    if (dto.remarks) {
      await this.enquiriesRepo.createHistory({
        id: generateId(),
        school_id: schoolId,
        enquiry_id: id,
        assigned_teacher_id: updated.assigned_teacher_id ?? null,
        action,
        details,
        remarks: dto.remarks,
        created_by: updatedBy,
      });
    }

    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return updated;
  }

  async remove(id: string, schoolId: string): Promise<void> {
    await this.findById(id, schoolId);
    await this.enquiriesRepo.softDelete(id, schoolId);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
  }

  async getHistory(enquiryId: string, schoolId: string): Promise<EnquiryHistory[]> {
    await this.findById(enquiryId, schoolId); // ensures enquiry exists and belongs to school
    return this.enquiriesRepo.findHistoryByEnquiryId(enquiryId, schoolId);
  }
}