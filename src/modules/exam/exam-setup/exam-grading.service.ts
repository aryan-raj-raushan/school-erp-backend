import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ExamGradingRepository } from './exam-grading.repository';
import { RedisService } from '../../redis/redis.service';
import {
  CreateExamGradingDto,
  UpdateExamGradingDto,
  CreateExamGradingBulkDto,
} from './dto/exam-grading.dto';
import { ExamGrading } from './types/exam-grading.types';
import { REDIS_EXAM_KEYS } from '@shared/redis/redis-key';
import { generateId } from '@utils/uuid.utils';

interface GradeRange {
  grade_name: string;
  from_percentage: string;
  to_percentage: string;
}

@Injectable()
export class ExamGradingService {
  constructor(
    private readonly repo: ExamGradingRepository,
    private readonly redis: RedisService,
  ) {}

  async findAll(schoolId: string): Promise<ExamGrading[]> {
    const key = REDIS_EXAM_KEYS.GRADING.LIST(schoolId);
    return this.redis.getOrSet(key, REDIS_EXAM_KEYS.ITEM_TTL, () => this.repo.findAll(schoolId));
  }

  async findById(id: string, schoolId: string): Promise<ExamGrading> {
    const key = REDIS_EXAM_KEYS.GRADING.ITEM(schoolId, id);
    return this.redis.getOrSet(key, REDIS_EXAM_KEYS.ITEM_TTL, async () => {
      const grading = await this.repo.findById(id, schoolId);
      if (!grading) throw new NotFoundException(`Exam grading '${id}' not found`);
      return grading;
    });
  }

  /**
   * Rejects duplicate grade_name (case-insensitive) and overlapping
   * [from_percentage, to_percentage] ranges — both within the incoming batch
   * and against the school's existing (non-deleted) grades. `excludeId`
   * lets a single-row update compare against everything except itself.
   */
  private async assertValidGrades(
    schoolId: string,
    incoming: GradeRange[],
    excludeId?: string,
  ): Promise<void> {
    const existing = (await this.repo.findAllIncludeDisabled(schoolId)).filter(
      (g) => g.id !== excludeId,
    );

    const seenNames = new Set(existing.map((g) => g.grade_name.trim().toLowerCase()));
    const ranges = existing.map((g) => ({
      grade_name: g.grade_name,
      from: Number(g.from_percentage),
      to: Number(g.to_percentage),
    }));

    for (const grade of incoming) {
      const nameKey = grade.grade_name.trim().toLowerCase();
      if (seenNames.has(nameKey)) {
        throw new BadRequestException(`Grade name '${grade.grade_name}' already exists`);
      }
      seenNames.add(nameKey);

      const from = Number(grade.from_percentage);
      const to = Number(grade.to_percentage);
      if (from >= to) {
        throw new BadRequestException(
          `Grade '${grade.grade_name}': from_percentage (${grade.from_percentage}) must be less than to_percentage (${grade.to_percentage})`,
        );
      }
      const overlap = ranges.find((r) => from < r.to && to > r.from);
      if (overlap) {
        throw new BadRequestException(
          `Grade '${grade.grade_name}' (${grade.from_percentage}-${grade.to_percentage}) overlaps with '${overlap.grade_name}'`,
        );
      }
      ranges.push({ grade_name: grade.grade_name, from, to });
    }
  }

  async create(
    dto: CreateExamGradingDto,
    schoolId: string,
    createdBy: string,
  ): Promise<ExamGrading> {
    await this.assertValidGrades(schoolId, [dto]);
    const grading = await this.repo.create({
      id: generateId(),
      school_id: schoolId,
      created_by: createdBy,
      ...dto,
    });
    await this.redis.del(REDIS_EXAM_KEYS.GRADING.LIST(schoolId));
    return grading;
  }

  async bulkCreate(
    dto: CreateExamGradingBulkDto,
    schoolId: string,
    createdBy: string,
  ): Promise<ExamGrading[]> {
    await this.assertValidGrades(schoolId, dto.grades);
    const rows = dto.grades.map((grade) => ({
      id: generateId(),
      school_id: schoolId,
      created_by: createdBy,
      ...grade,
    }));
    const created = await this.repo.createMany(rows);
    await this.redis.del(REDIS_EXAM_KEYS.GRADING.LIST(schoolId));
    return created;
  }

  async update(id: string, schoolId: string, dto: UpdateExamGradingDto): Promise<ExamGrading> {
    const existing = await this.findById(id, schoolId);
    if (dto.grade_name || dto.from_percentage || dto.to_percentage) {
      await this.assertValidGrades(
        schoolId,
        [
          {
            grade_name: dto.grade_name ?? existing.grade_name,
            from_percentage: dto.from_percentage ?? existing.from_percentage,
            to_percentage: dto.to_percentage ?? existing.to_percentage,
          },
        ],
        id,
      );
    }
    const updated = await this.repo.update(id, schoolId, dto);
    await this.redis.del(REDIS_EXAM_KEYS.GRADING.LIST(schoolId));
    await this.redis.del(REDIS_EXAM_KEYS.GRADING.ITEM(schoolId, id));
    return updated;
  }

  async remove(id: string, schoolId: string): Promise<void> {
    await this.findById(id, schoolId);
    await this.repo.softDelete(id, schoolId);
    await this.redis.del(REDIS_EXAM_KEYS.GRADING.LIST(schoolId));
    await this.redis.del(REDIS_EXAM_KEYS.GRADING.ITEM(schoolId, id));
  }
}
