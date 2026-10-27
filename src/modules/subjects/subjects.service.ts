import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { SubjectsRepository } from './subjects.repository';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { PaginationResponse } from '../../shared/responses/api-response';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { SubjectFilterDto } from './dto/subject-filter.dto';
import { Subject } from './types/subject.types';
import { CacheTTL } from '../../shared/constants';

const DEFAULT_TOTAL_MARKS = 100;

@Injectable()
export class SubjectsService {
  constructor(
    private readonly subjectsRepo: SubjectsRepository,
    private readonly redisService: RedisService,
  ) {}

  private cacheKey(schoolId: string): string {
    return `subjects:${schoolId}`;
  }

  async findAll(schoolId: string, filters: SubjectFilterDto): Promise<PaginationResponse<Subject>> {
    const key = `${this.cacheKey(schoolId)}:list:${filters.page ?? 1}:${filters.limit ?? 20}:${filters.search ?? ''}`;
    return this.redisService.getOrSet(key, CacheTTL.LONG, async () => {
      const [items, total] = await Promise.all([
        this.subjectsRepo.findAll(schoolId, filters),
        this.subjectsRepo.count(schoolId, filters),
      ]);
      return PaginationResponse.of(items, total, filters);
    });
  }

  async findById(id: string, schoolId: string): Promise<Subject> {
    const key = `subjects:${schoolId}:${id}`;
    return this.redisService.getOrSet(key, CacheTTL.LONG, async () => {
      const subject = await this.subjectsRepo.findById(id, schoolId);
      if (!subject) {
        throw new NotFoundException(`Subject with id '${id}' not found`);
      }
      return subject;
    });
  }

  private async assertValidSubject(
    schoolId: string,
    subject: {
      name?: string;
      code?: string | null;
      total_marks?: number | null;
      passing_marks?: number | null;
    },
    excludeId?: string,
  ): Promise<void> {
    if (
      subject.total_marks != null &&
      subject.passing_marks != null &&
      subject.passing_marks > subject.total_marks
    ) {
      throw new BadRequestException('passing_marks cannot be greater than total_marks');
    }
    const conflicts = (
      await this.subjectsRepo.findConflicting(schoolId, subject.name, subject.code ?? undefined)
    ).filter((s) => s.id !== excludeId);
    const sameName = conflicts.find((s) => s.name.toLowerCase() === subject.name?.toLowerCase());
    if (sameName) throw new ConflictException(`Subject '${sameName.name}' already exists`);
    const sameCode = conflicts.find(
      (s) => s.code && s.code.toLowerCase() === subject.code?.toLowerCase(),
    );
    if (sameCode) {
      throw new ConflictException(
        `Subject code '${sameCode.code}' is already used by '${sameCode.name}'`,
      );
    }
  }

  async create(dto: CreateSubjectDto, schoolId: string, createdBy: string): Promise<Subject> {
    await this.assertValidSubject(schoolId, {
      ...dto,
      total_marks: dto.total_marks ?? DEFAULT_TOTAL_MARKS,
    });
    const subject = await this.subjectsRepo.create({
      id: generateId(),
      school_id: schoolId,
      created_by: createdBy,
      ...dto,
      is_elective: dto.is_elective ?? false,
      is_active: dto.is_active ?? true,
    });
    await this.redisService.delByPattern(`subjects:${schoolId}:*`);
    return subject;
  }

  async update(id: string, schoolId: string, dto: UpdateSubjectDto): Promise<Subject> {
    const existing = await this.findById(id, schoolId);
    await this.assertValidSubject(
      schoolId,
      {
        name: dto.name,
        code: dto.code,
        total_marks: dto.total_marks ?? existing.total_marks,
        passing_marks: dto.passing_marks ?? existing.passing_marks,
      },
      id,
    );
    const updated = await this.subjectsRepo.update(id, schoolId, dto);
    await this.redisService.delByPattern(`subjects:${schoolId}:*`);
    return updated;
  }

  async remove(id: string, schoolId: string): Promise<void> {
    await this.findById(id, schoolId);
    await this.subjectsRepo.softDelete(id, schoolId);
    await this.redisService.delByPattern(`subjects:${schoolId}:*`);
  }
}
