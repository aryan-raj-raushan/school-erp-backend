import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ClassesRepository } from './classes.repository';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { PaginationResponse } from '../../shared/responses/api-response';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { ClassFilterDto } from './dto/class-filter.dto';
import { Class, ClassSectionView } from './types/class.types';
import { CacheTTL } from '../../shared/constants';

@Injectable()
export class ClassesService {
  constructor(
    private readonly classesRepo: ClassesRepository,
    private readonly redisService: RedisService,
  ) {}

  private cacheKey(schoolId: string, academicYearId?: string): string {
    return `classes:${schoolId}:${academicYearId ?? 'all'}`;
  }

  async findAll(
    schoolId: string,
    filters: ClassFilterDto,
  ): Promise<PaginationResponse<ClassSectionView>> {
    const key = `${this.cacheKey(schoolId, filters.academic_year_id)}:list:${filters.page ?? 1}:${filters.limit ?? 20}`;
    return this.redisService.getOrSet(key, CacheTTL.LONG, async () => {
      const [items, total] = await Promise.all([
        this.classesRepo.findAll(schoolId, filters),
        this.classesRepo.count(schoolId, filters),
      ]);
      return PaginationResponse.of(items, total, filters);
    });
  }

  async findById(id: string, schoolId: string): Promise<Class> {
    const key = `classes:${schoolId}:${id}`;
    return this.redisService.getOrSet(key, CacheTTL.LONG, async () => {
      const cls = await this.classesRepo.findById(id, schoolId);
      if (!cls) throw new NotFoundException(`Class with id '${id}' not found`);
      return cls;
    });
  }

  private async assertValidClass(
    schoolId: string,
    cls: { academic_year_id: string; name?: string; class_type?: string; class_sequence?: number },
    excludeId?: string,
  ): Promise<void> {
    const year = await this.classesRepo.findAcademicYear(schoolId, cls.academic_year_id);
    if (!year) throw new NotFoundException(`Academic year '${cls.academic_year_id}' not found`);
    if (year.is_frozen) {
      throw new BadRequestException(
        `Academic year '${year.name}' is frozen — unfreeze it before making changes`,
      );
    }
    if (cls.class_type && !(await this.classesRepo.classTypeExists(schoolId, cls.class_type))) {
      throw new BadRequestException(
        `Class type '${cls.class_type}' does not exist — create it under Class Types first`,
      );
    }
    const siblings = (
      await this.classesRepo.findClassesInYear(schoolId, cls.academic_year_id)
    ).filter((c) => c.id !== excludeId);
    const name = cls.name?.toLowerCase();
    const sameName = name ? siblings.find((c) => c.name.toLowerCase() === name) : undefined;
    if (sameName) {
      throw new ConflictException(`Class '${sameName.name}' already exists in this academic year`);
    }
    if (cls.class_sequence != null) {
      const sameSequence = siblings.find((c) => c.class_sequence === cls.class_sequence);
      if (sameSequence) {
        throw new ConflictException(
          `Sequence ${cls.class_sequence} is already used by '${sameSequence.name}' in this academic year`,
        );
      }
    }
  }

  async create(dto: CreateClassDto, schoolId: string, createdBy: string): Promise<Class> {
    await this.assertValidClass(schoolId, dto);
    const sectionNames = Array.from(
      new Set(
        (dto.default_sections ?? '')
          .toUpperCase()
          .replace(/[^A-Z]/g, '')
          .split(''),
      ),
    ).filter(Boolean);
    const cls = await this.classesRepo.createWithSections(
      {
        id: generateId(),
        school_id: schoolId,
        created_by: createdBy,
        ...dto,
        default_sections: sectionNames.join('') || undefined,
      },
      sectionNames,
    );
    await this.redisService.delByPattern(`classes:${schoolId}:*`);
    await this.redisService.delByPattern(`sections:${schoolId}:*`);
    return cls;
  }

  async update(id: string, schoolId: string, dto: UpdateClassDto): Promise<Class> {
    const existing = await this.classesRepo.findById(id, schoolId);
    if (!existing) throw new NotFoundException(`Class with id '${id}' not found`);
    await this.assertValidClass(
      schoolId,
      {
        academic_year_id: dto.academic_year_id ?? existing.academic_year_id,
        name: dto.name,
        class_type: dto.class_type,
        class_sequence: dto.class_sequence,
      },
      id,
    );
    const updated = await this.classesRepo.update(id, schoolId, dto);
    if (!updated) throw new NotFoundException(`Class with id '${id}' not found`);
    await this.redisService.delByPattern(`classes:${schoolId}:*`);
    return updated;
  }

  async remove(id: string, schoolId: string): Promise<void> {
    // id is class UUID (frontend passes class_id directly after normalization)
    const existing = await this.classesRepo.findById(id, schoolId);
    if (!existing) throw new NotFoundException(`Class with id '${id}' not found`);
    await this.classesRepo.softDelete(id, schoolId);
    await this.redisService.delByPattern(`classes:${schoolId}:*`);
  }
}
