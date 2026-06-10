import { Injectable, NotFoundException } from '@nestjs/common';
import { SyllabiRepository } from './syllabi.repository';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { PaginationResponse } from '../../shared/responses/api-response';
import { CreateSyllabusDto } from './dto/create-syllabus.dto';
import { UpdateSyllabusDto } from './dto/update-syllabus.dto';
import { FilterSyllabusDto } from './dto/filter-syllabus.dto';
import { Syllabus, SyllabusWithAttachments } from './types/syllabus.types';
import { CacheTTL } from '../../shared/constants';

@Injectable()
export class SyllabiService {
  constructor(
    private readonly syllabiRepo: SyllabiRepository,
    private readonly redisService: RedisService,
  ) {}

  private cacheKey(schoolId: string): string {
    return `syllabi:${schoolId}`;
  }

  async findAll(
    schoolId: string,
    filters: FilterSyllabusDto,
  ): Promise<PaginationResponse<Syllabus>> {
    const key = `${this.cacheKey(schoolId)}:list:${JSON.stringify(filters)}`;
    return this.redisService.getOrSet(key, CacheTTL.LONG, async () => {
      const [items, total] = await Promise.all([
        this.syllabiRepo.findAll(schoolId, filters),
        this.syllabiRepo.count(schoolId, filters),
      ]);
      return PaginationResponse.of(items, total, filters);
    });
  }

  async findById(id: string, schoolId: string): Promise<SyllabusWithAttachments> {
    const key = `${this.cacheKey(schoolId)}:${id}`;
    return this.redisService.getOrSet(key, CacheTTL.LONG, async () => {
      const syllabus = await this.syllabiRepo.findWithAttachments(id, schoolId);
      if (!syllabus) throw new NotFoundException(`Syllabus with id '${id}' not found`);
      return syllabus;
    });
  }

  async create(
    dto: CreateSyllabusDto,
    schoolId: string,
    createdBy: string,
  ): Promise<SyllabusWithAttachments> {
    const { attachments, ...rest } = dto;
    const syllabusId = generateId();

    const syllabus = await this.syllabiRepo.create({
      id: syllabusId,
      school_id: schoolId,
      created_by: createdBy,
      ...rest,
      is_enabled: rest.is_enabled ?? true,
    });

    const savedAttachments = await this.syllabiRepo.createAttachments(
      (attachments ?? []).map((a) => ({
        id: generateId(),
        syllabus_id: syllabusId,
        school_id: schoolId,
        ...a,
      })),
    );

    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return { ...syllabus, attachments: savedAttachments };
  }

  async update(
    id: string,
    schoolId: string,
    dto: UpdateSyllabusDto,
  ): Promise<SyllabusWithAttachments> {
    await this.findById(id, schoolId);
    const { attachments, ...rest } = dto;

    const updated = await this.syllabiRepo.update(id, schoolId, rest);

    if (attachments !== undefined) {
      await this.syllabiRepo.deleteAttachmentsBySyllabusId(id);
      await this.syllabiRepo.createAttachments(
        attachments.map((a) => ({ id: generateId(), syllabus_id: id, school_id: schoolId, ...a })),
      );
    }

    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    const newAttachments = await this.syllabiRepo.findAttachments(id);
    return { ...updated, attachments: newAttachments };
  }

  async removeAttachment(
    syllabusId: string,
    attachmentId: string,
    schoolId: string,
  ): Promise<void> {
    await this.findById(syllabusId, schoolId);
    await this.syllabiRepo.deleteAttachmentById(attachmentId);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
  }

  async remove(id: string, schoolId: string): Promise<void> {
    await this.findById(id, schoolId);
    await this.syllabiRepo.softDelete(id, schoolId);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
  }
}
