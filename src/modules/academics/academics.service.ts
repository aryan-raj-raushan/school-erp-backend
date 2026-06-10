import { Injectable, NotFoundException } from '@nestjs/common';
import { AcademicsRepository } from './academics.repository';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { BulkMarkSubmissionsDto, UpdateSubmissionDto } from './dto/submission.dto';
import { CreateStudyMaterialDto } from './dto/create-study-material.dto';
import {
  Homework,
  HomeworkAttachment,
  HomeworkSubmission,
  StudyMaterial,
} from './types/academic.types';
import { CacheTTL } from '../../shared/constants';

@Injectable()
export class AcademicsService {
  constructor(
    private readonly repo: AcademicsRepository,
    private readonly redisService: RedisService,
  ) {}

  private cacheKey(schoolId: string) {
    return `academics:${schoolId}`;
  }

  // Homework
  async findAllHomework(
    schoolId: string,
    filters: {
      class_id?: string;
      class_detail_id?: string;
      subject_id?: string;
      academic_year_id?: string;
    },
  ): Promise<Homework[]> {
    const key = `${this.cacheKey(schoolId)}:hw:list:${JSON.stringify(filters)}`;
    return this.redisService.getOrSet(key, CacheTTL.MEDIUM, () =>
      this.repo.findAllHomework(schoolId, filters),
    );
  }

  async findHomeworkById(id: string, schoolId: string): Promise<Homework> {
    const key = `${this.cacheKey(schoolId)}:hw:${id}`;
    return this.redisService.getOrSet(key, CacheTTL.MEDIUM, async () => {
      const hw = await this.repo.findHomeworkById(id, schoolId);
      if (!hw) throw new NotFoundException(`Homework with id '${id}' not found`);
      return hw;
    });
  }

  async getHomeworkWithAttachments(
    id: string,
    schoolId: string,
  ): Promise<{ homework: Homework; attachments: HomeworkAttachment[] }> {
    const homework = await this.findHomeworkById(id, schoolId);
    const attachments = await this.repo.findAttachmentsByHomework(id);
    return { homework, attachments };
  }

  async createHomework(
    dto: CreateHomeworkDto,
    schoolId: string,
    assignedBy: string,
  ): Promise<{ homework: Homework; attachments: HomeworkAttachment[] }> {
    const { attachments: attachmentDtos, ...homeworkData } = dto;
    const hw = await this.repo.createHomework({
      id: generateId(),
      school_id: schoolId,
      assigned_by: assignedBy,
      ...homeworkData,
      status: homeworkData.status as Homework['status'],
    });

    const attachments = attachmentDtos?.length
      ? await this.repo.createAttachments(
          attachmentDtos.map((a) => ({
            id: generateId(),
            homework_id: hw.id,
            school_id: schoolId,
            ...a,
          })),
        )
      : [];

    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:hw:*`);
    return { homework: hw, attachments };
  }

  async updateHomework(
    id: string,
    schoolId: string,
    dto: Partial<CreateHomeworkDto>,
  ): Promise<{ homework: Homework; attachments: HomeworkAttachment[] }> {
    await this.findHomeworkById(id, schoolId);
    const { attachments: attachmentDtos, ...homeworkData } = dto;
    const updated = await this.repo.updateHomework(id, schoolId, {
      ...homeworkData,
      status: homeworkData.status as Homework['status'],
    });

    let attachments: HomeworkAttachment[];
    if (attachmentDtos !== undefined) {
      await this.repo.deleteAttachmentsByHomework(id);
      attachments = attachmentDtos.length
        ? await this.repo.createAttachments(
            attachmentDtos.map((a) => ({
              id: generateId(),
              homework_id: id,
              school_id: schoolId,
              ...a,
            })),
          )
        : [];
    } else {
      attachments = await this.repo.findAttachmentsByHomework(id);
    }

    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:hw:*`);
    return { homework: updated, attachments };
  }

  async deleteHomework(id: string, schoolId: string): Promise<void> {
    await this.findHomeworkById(id, schoolId);
    await this.repo.softDeleteHomework(id, schoolId);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:hw:*`);
  }

  // Submissions
  async getSubmissions(homeworkId: string, schoolId: string): Promise<HomeworkSubmission[]> {
    await this.findHomeworkById(homeworkId, schoolId);
    const key = `${this.cacheKey(schoolId)}:hw:${homeworkId}:submissions`;
    return this.redisService.getOrSet(key, CacheTTL.MEDIUM, () =>
      this.repo.findSubmissionsByHomework(homeworkId, schoolId),
    );
  }

  async getStudentSubmission(
    homeworkId: string,
    studentId: string,
    schoolId: string,
  ): Promise<HomeworkSubmission | null> {
    const key = `${this.cacheKey(schoolId)}:hw:${homeworkId}:sub:${studentId}`;
    return this.redisService.getOrSet(
      key,
      CacheTTL.MEDIUM,
      async () =>
        (await this.repo.findSubmissionByStudent(homeworkId, studentId, schoolId)) ?? null,
    );
  }

  async bulkMarkSubmissions(
    homeworkId: string,
    dto: BulkMarkSubmissionsDto,
    schoolId: string,
  ): Promise<HomeworkSubmission[]> {
    await this.findHomeworkById(homeworkId, schoolId);
    const results: HomeworkSubmission[] = [];
    for (const s of dto.submissions) {
      const sub = await this.repo.upsertSubmission({
        id: generateId(),
        school_id: schoolId,
        homework_id: homeworkId,
        student_id: s.student_id,
        status: s.status as HomeworkSubmission['status'],
        remarks: s.remarks,
        submitted_at: s.status === 'SUBMITTED' || s.status === 'GRADED' ? new Date() : undefined,
      });
      results.push(sub);
    }
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:hw:${homeworkId}:sub*`);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:hw:${homeworkId}:submissions`);
    return results;
  }

  async updateStudentSubmission(
    homeworkId: string,
    studentId: string,
    schoolId: string,
    dto: UpdateSubmissionDto,
  ): Promise<HomeworkSubmission> {
    const sub = await this.repo.updateSubmission(homeworkId, studentId, schoolId, {
      status: dto.status as HomeworkSubmission['status'],
      remarks: dto.remarks,
      submission_url: dto.submission_url,
    });
    if (!sub) throw new NotFoundException('Submission not found');
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:hw:${homeworkId}:sub*`);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:hw:${homeworkId}:submissions`);
    return sub;
  }

  // Study Materials
  async findAllMaterials(
    schoolId: string,
    filters: {
      class_id?: string;
      class_detail_id?: string;
      subject_id?: string;
      academic_year_id?: string;
    },
  ): Promise<StudyMaterial[]> {
    const key = `${this.cacheKey(schoolId)}:mat:list:${JSON.stringify(filters)}`;
    return this.redisService.getOrSet(key, CacheTTL.MEDIUM, () =>
      this.repo.findAllMaterials(schoolId, filters),
    );
  }

  async findMaterialById(id: string, schoolId: string): Promise<StudyMaterial> {
    const key = `${this.cacheKey(schoolId)}:mat:${id}`;
    return this.redisService.getOrSet(key, CacheTTL.MEDIUM, async () => {
      const mat = await this.repo.findMaterialById(id, schoolId);
      if (!mat) throw new NotFoundException(`Study material with id '${id}' not found`);
      return mat;
    });
  }

  async createMaterial(
    dto: CreateStudyMaterialDto,
    schoolId: string,
    uploadedBy: string,
  ): Promise<StudyMaterial> {
    const mat = await this.repo.createMaterial({
      id: generateId(),
      school_id: schoolId,
      uploaded_by: uploadedBy,
      ...dto,
    });
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:mat:*`);
    return mat;
  }

  async updateMaterial(
    id: string,
    schoolId: string,
    dto: Partial<CreateStudyMaterialDto>,
  ): Promise<StudyMaterial> {
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
