import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AdmissionEnquiriesRepository } from './admission-enquiries.repository';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { PaginationResponse } from '../../shared/responses/api-response';
import { CreateAdmissionEnquiryDto } from './dto/create-admission-enquiry.dto';
import { UpdateAdmissionEnquiryDto } from './dto/update-admission-enquiry.dto';
import { FilterAdmissionEnquiryDto } from './dto/filter-admission-enquiry.dto';
import { CreateEnquiryHistoryDto } from './dto/create-enquiry-history.dto';
import { AdmissionEnquiry, EnquiryHistory } from './types/admission-enquiry.types';
import { EnquiryAction } from '@shared/enums/admission.enum';
import { REDIS_ADMISSION_KEY } from '@shared/redis/redis-key';


@Injectable()
export class AdmissionEnquiriesService {
  constructor(
    private readonly enquiriesRepo: AdmissionEnquiriesRepository,
    private readonly redisService: RedisService,
  ) {}

  private cacheKey(schoolId: string) {
    return REDIS_ADMISSION_KEY.ADMISSION_ENQUIRY(schoolId);
  }

  async findAll(
    schoolId: string,
    filters: FilterAdmissionEnquiryDto,
  ): Promise<PaginationResponse<AdmissionEnquiry>> {
    const key = `${this.cacheKey(schoolId)}:list:${JSON.stringify(filters)}`;
    return this.redisService.getOrSet(key, REDIS_ADMISSION_KEY.LIST_TTL, async () => {
      const [items, total] = await Promise.all([
        this.enquiriesRepo.findAll(schoolId, filters),
        this.enquiriesRepo.count(schoolId, filters),
      ]);
      return PaginationResponse.of(items, total, filters);
    });
  }

  async findById(id: string, schoolId: string): Promise<AdmissionEnquiry> {
    const key = `${this.cacheKey(schoolId)}:${id}`;
    return this.redisService.getOrSet(key, REDIS_ADMISSION_KEY.ITEM_TTL, async () => {
      const enquiry = await this.enquiriesRepo.findById(id, schoolId);
      if (!enquiry) throw new NotFoundException(`Admission enquiry with id '${id}' not found`);
      return enquiry;
    });
  }

  async create(
    dto: CreateAdmissionEnquiryDto,
    schoolId: string,
    createdBy: string,
  ): Promise<AdmissionEnquiry> {
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

  async update(
    id: string,
    schoolId: string,
    dto: UpdateAdmissionEnquiryDto,
    updatedBy: string,
  ): Promise<AdmissionEnquiry> {
    await this.findById(id, schoolId);
    const updated = await this.enquiriesRepo.update(id, schoolId, dto);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return updated;
  }

  async remove(id: string, schoolId: string): Promise<void> {
    await this.findById(id, schoolId);
    await this.enquiriesRepo.softDelete(id, schoolId);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
  }

  // ─── History ────────────────────────────────────────

  async getHistory(enquiryId: string, schoolId: string): Promise<EnquiryHistory[]> {
    // Verify enquiry exists and belongs to this school
    await this.findById(enquiryId, schoolId);

    const key = `${this.cacheKey(schoolId)}:${enquiryId}:history`;
    return this.redisService.getOrSet(key, REDIS_ADMISSION_KEY.HISTORY_TTL, () =>
      this.enquiriesRepo.findHistoryByEnquiryId(enquiryId, schoolId),
    );
  }

  async addHistory(
    enquiryId: string,
    schoolId: string,
    dto: CreateEnquiryHistoryDto,
    createdBy: string,
  ): Promise<EnquiryHistory> {
    const enquiry = await this.findById(enquiryId, schoolId);

    // Block history additions on terminal statuses
    if (
      enquiry.status === 'ADMISSION_CONFIRMED' ||
      enquiry.status === 'REJECTED'
    ) {
      throw new ForbiddenException(
        `Cannot add history to an enquiry with status '${enquiry.status}'`,
      );
    }

    // Validate: NEXT_FOLLOW_UP_UPDATE requires date
    if (dto.action === EnquiryAction.NEXT_FOLLOW_UP_UPDATE && !dto.next_followup_date) {
      throw new ForbiddenException(
        'next_followup_date is required when action is NEXT_FOLLOW_UP_UPDATE',
      );
    }

    // Create history entry
    const entry = await this.enquiriesRepo.createHistory({
      id: generateId(),
      school_id: schoolId,
      enquiry_id: enquiryId,
      assigned_teacher_id: enquiry.assigned_teacher_id ?? null,
      action: dto.action,
      next_followup_date: dto.next_followup_date ?? null,
      next_followup_time: dto.next_followup_time ?? null,
      details: dto.details ?? null,
      remarks: dto.remarks,
      created_by: createdBy,
    });

    // Side-effect: if NEXT_FOLLOW_UP_UPDATE, sync date/time back to parent enquiry
    if (
      dto.action === EnquiryAction.NEXT_FOLLOW_UP_UPDATE &&
      dto.next_followup_date
    ) {
      await this.enquiriesRepo.update(enquiryId, schoolId, {
        next_followup_date: dto.next_followup_date,
        next_followup_time: dto.next_followup_time ?? null,
        status: 'FOLLOW_UP',
      });
    }

    // Side-effect: sync status for terminal actions
    if (dto.action === EnquiryAction.ADMISSION_CONFIRMED) {
      await this.enquiriesRepo.update(enquiryId, schoolId, {
        status: 'ADMISSION_CONFIRMED',
      });
    }

    if (dto.action === EnquiryAction.ENQUIRY_REJECTED) {
      await this.enquiriesRepo.update(enquiryId, schoolId, {
        status: 'REJECTED',
      });
    }

    // Invalidate all caches for this enquiry
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:${enquiryId}*`);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:list:*`);

    return entry;
  }
}