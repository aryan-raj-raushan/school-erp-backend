import { Injectable, NotFoundException } from '@nestjs/common';
import { ExamTemplateRepository } from './exam-template.repository';
import { RedisService } from '../../redis/redis.service';
import { CreateExamTemplateDto, UpdateExamTemplateDto } from './dto/exam-template.dto';
import { ExamTemplate } from './types/exam-template.types';
import { generateId } from '@utils/uuid.utils';

@Injectable()
export class ExamTemplateService {
  constructor(
    private readonly repo: ExamTemplateRepository,
    private readonly redis: RedisService,
  ) {}

  private key(schoolId: string) {
    return `exam:template:${schoolId}:list`;
  }

  async findAll(schoolId: string): Promise<ExamTemplate[]> {
    return this.redis.getOrSet(this.key(schoolId), 21600, () => this.repo.findAll(schoolId));
  }

  async findById(id: string, schoolId: string): Promise<ExamTemplate> {
    const template = await this.repo.findById(id, schoolId);
    if (!template) throw new NotFoundException(`Exam template '${id}' not found`);
    return template;
  }

  async create(
    dto: CreateExamTemplateDto,
    schoolId: string,
    createdBy: string,
  ): Promise<ExamTemplate> {
    const template = await this.repo.create({
      id: generateId(),
      school_id: schoolId,
      created_by: createdBy,
      ...dto,
    });
    await this.redis.del(this.key(schoolId));
    return template;
  }

  async update(id: string, schoolId: string, dto: UpdateExamTemplateDto): Promise<ExamTemplate> {
    await this.findById(id, schoolId);
    const updated = await this.repo.update(id, schoolId, dto);
    await this.redis.del(this.key(schoolId));
    return updated;
  }

  async remove(id: string, schoolId: string): Promise<void> {
    await this.findById(id, schoolId);
    await this.repo.softDelete(id, schoolId);
    await this.redis.del(this.key(schoolId));
  }
}
