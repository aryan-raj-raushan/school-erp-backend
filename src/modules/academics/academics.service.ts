import { Injectable, NotFoundException } from '@nestjs/common';
import { AcademicsRepository } from './academics.repository';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { BulkMarkSubmissionsDto, UpdateSubmissionDto } from './dto/submission.dto';
import { CreateStudyMaterialDto } from './dto/create-study-material.dto';
import { Homework, HomeworkSubmission, StudyMaterial } from './types/academic.types';

const CACHE_TTL = 120;

@Injectable()
export class AcademicsService {
  constructor(
    private readonly repo: AcademicsRepository,
    private readonly redisService: RedisService,
  ) {}

  private cacheKey(schoolId: string) { return `academics:${schoolId}`; }

  // Homework
  async findAllHomework(schoolId: string, filters: any): Promise<Homework[]> {
    return this.repo.findAllHomework(schoolId, filters);
  }

  async findHomeworkById(id: string, schoolId: string): Promise<Homework> {
    const hw = await this.repo.findHomeworkById(id, schoolId);
    if (!hw) throw new NotFoundException(`Homework with id '${id}' not found`);
    return hw;
  }

  async createHomework(dto: CreateHomeworkDto, schoolId: string, assignedBy: string): Promise<Homework> {
    const hw = await this.repo.createHomework({ id: generateId(), school_id: schoolId, assigned_by: assignedBy, ...dto });
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:hw:*`);
    return hw;
  }

  async updateHomework(id: string, schoolId: string, dto: Partial<CreateHomeworkDto>): Promise<Homework> {
    await this.findHomeworkById(id, schoolId);
    const updated = await this.repo.updateHomework(id, schoolId, dto);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:hw:*`);
    return updated;
  }

  async deleteHomework(id: string, schoolId: string): Promise<void> {
    await this.findHomeworkById(id, schoolId);
    await this.repo.softDeleteHomework(id, schoolId);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:hw:*`);
  }

  // Submissions
  async getSubmissions(homeworkId: string, schoolId: string): Promise<HomeworkSubmission[]> {
    await this.findHomeworkById(homeworkId, schoolId);
    return this.repo.findSubmissionsByHomework(homeworkId, schoolId);
  }

  async getStudentSubmission(homeworkId: string, studentId: string, schoolId: string): Promise<HomeworkSubmission | null> {
    return (await this.repo.findSubmissionByStudent(homeworkId, studentId, schoolId)) ?? null;
  }

  async bulkMarkSubmissions(homeworkId: string, dto: BulkMarkSubmissionsDto, schoolId: string): Promise<HomeworkSubmission[]> {
    await this.findHomeworkById(homeworkId, schoolId);
    const results: HomeworkSubmission[] = [];
    for (const s of dto.submissions) {
      const sub = await this.repo.upsertSubmission({
        id: generateId(), school_id: schoolId, homework_id: homeworkId,
        student_id: s.student_id, status: s.status as any, remarks: s.remarks,
        submitted_at: s.status === 'SUBMITTED' || s.status === 'GRADED' ? new Date() : undefined,
      });
      results.push(sub);
    }
    return results;
  }

  async updateStudentSubmission(homeworkId: string, studentId: string, schoolId: string, dto: UpdateSubmissionDto): Promise<HomeworkSubmission> {
    const sub = await this.repo.updateSubmission(homeworkId, studentId, schoolId, { status: dto.status as any, remarks: dto.remarks, submission_url: dto.submission_url });
    if (!sub) throw new NotFoundException('Submission not found');
    return sub;
  }

  // Study Materials
  async findAllMaterials(schoolId: string, filters: any): Promise<StudyMaterial[]> {
    return this.repo.findAllMaterials(schoolId, filters);
  }

  async findMaterialById(id: string, schoolId: string): Promise<StudyMaterial> {
    const mat = await this.repo.findMaterialById(id, schoolId);
    if (!mat) throw new NotFoundException(`Study material with id '${id}' not found`);
    return mat;
  }

  async createMaterial(dto: CreateStudyMaterialDto, schoolId: string, uploadedBy: string): Promise<StudyMaterial> {
    const mat = await this.repo.createMaterial({ id: generateId(), school_id: schoolId, uploaded_by: uploadedBy, ...dto });
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:mat:*`);
    return mat;
  }

  async updateMaterial(id: string, schoolId: string, dto: Partial<CreateStudyMaterialDto>): Promise<StudyMaterial> {
    await this.findMaterialById(id, schoolId);
    const updated = await this.repo.updateMaterial(id, schoolId, dto);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:mat:*`);
    return updated;
  }

  async deleteMaterial(id: string, schoolId: string): Promise<void> {
    await this.findMaterialById(id, schoolId);
    await this.repo.softDeleteMaterial(id, schoolId);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:mat:*`);
  }
}
