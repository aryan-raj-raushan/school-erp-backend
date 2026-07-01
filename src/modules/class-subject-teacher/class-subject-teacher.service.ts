import { Injectable } from '@nestjs/common';
import { ClassSubjectTeacherRepository } from './class-subject-teacher.repository';
import { RedisService } from '../redis/redis.service';
import { UpsertClassSubjectTeachersDto } from './dto/upsert-class-subject-teachers.dto';
import {
  ClassSubjectTeacher,
  ClassSubjectTeacherWithNames,
} from './types/class-subject-teacher.types';
import { CacheTTL } from '../../shared/constants';

@Injectable()
export class ClassSubjectTeacherService {
  constructor(
    private readonly repo: ClassSubjectTeacherRepository,
    private readonly redisService: RedisService,
  ) {}

  private cacheKey(schoolId: string, academicYearId: string, classId: string): string {
    return `class-subject-teachers:${schoolId}:${academicYearId}:${classId}`;
  }

  async findForClass(
    schoolId: string,
    academicYearId: string,
    classId: string,
  ): Promise<ClassSubjectTeacherWithNames[]> {
    const key = this.cacheKey(schoolId, academicYearId, classId);
    return this.redisService.getOrSet(key, CacheTTL.LONG, () =>
      this.repo.findForClass(schoolId, academicYearId, classId),
    );
  }

  async replaceForClass(
    dto: UpsertClassSubjectTeachersDto,
    schoolId: string,
    userId: string,
  ): Promise<ClassSubjectTeacher[]> {
    const result = await this.repo.replaceForClass(
      schoolId,
      dto.academic_year_id,
      dto.class_id,
      dto.mappings,
      userId,
    );
    await this.redisService.del(this.cacheKey(schoolId, dto.academic_year_id, dto.class_id));
    return result;
  }

  async remove(id: string, schoolId: string): Promise<void> {
    await this.repo.remove(id, schoolId);
    await this.redisService.delByPattern(`class-subject-teachers:${schoolId}:*`);
  }
}
