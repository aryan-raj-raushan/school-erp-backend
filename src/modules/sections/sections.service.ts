import { Injectable, NotFoundException } from '@nestjs/common';
import { SectionsRepository } from './sections.repository';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { Section } from './types/section.types';

const CACHE_TTL = 120;

@Injectable()
export class SectionsService {
  constructor(
    private readonly sectionsRepo: SectionsRepository,
    private readonly redisService: RedisService,
  ) {}

  private cacheKey(schoolId: string, classId?: string): string {
    return `sections:${schoolId}:${classId ?? 'all'}`;
  }

  async findAll(schoolId: string, classId?: string): Promise<Section[]> {
    const key = this.cacheKey(schoolId, classId);
    return this.redisService.getOrSet(key, CACHE_TTL, async () => {
      return this.sectionsRepo.findAll(schoolId, classId);
    });
  }

  async findById(id: string, schoolId: string): Promise<Section> {
    const key = `sections:${schoolId}:id:${id}`;
    return this.redisService.getOrSet(key, CACHE_TTL, async () => {
      const section = await this.sectionsRepo.findById(id, schoolId);
      if (!section) {
        throw new NotFoundException(`Section with id '${id}' not found`);
      }
      return section;
    });
  }

  async create(
    dto: CreateSectionDto,
    schoolId: string,
  ): Promise<Section> {
    const section = await this.sectionsRepo.create({
      id: generateId(),
      school_id: schoolId,
      ...dto,
    });
    await this.redisService.delByPattern(`sections:${schoolId}:*`);
    return section;
  }

  async update(
    id: string,
    schoolId: string,
    dto: UpdateSectionDto,
  ): Promise<Section> {
    await this.findById(id, schoolId);
    const updated = await this.sectionsRepo.update(id, schoolId, dto);
    await this.redisService.delByPattern(`sections:${schoolId}:*`);
    return updated;
  }

  async remove(id: string, schoolId: string): Promise<void> {
    await this.findById(id, schoolId);
    await this.sectionsRepo.softDelete(id, schoolId);
    await this.redisService.delByPattern(`sections:${schoolId}:*`);
  }
}
