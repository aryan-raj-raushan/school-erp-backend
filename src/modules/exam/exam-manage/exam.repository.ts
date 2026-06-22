import { Injectable, Inject } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { Exam, NewExam } from './types/exam.types';
import { FilterExamDto } from './dto/exam.dto';
import { DRIZZLE_ORM } from '@database/drizzle/drizzle.constants';
import { exams } from '@database/drizzle/schema/exam.schema';
import { DrizzleDB } from '@database/drizzle/drizzle.provider';

@Injectable()
export class ExamRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  private buildConditions(schoolId: string, filters: FilterExamDto) {
    const conditions = [eq(exams.school_id, schoolId), eq(exams.deleted, false)];

    if (filters.academic_year_id)
      conditions.push(eq(exams.academic_year_id, filters.academic_year_id));
    if (filters.class_id) conditions.push(eq(exams.class_id, filters.class_id));
    if (filters.exam_term) conditions.push(eq(exams.exam_term, filters.exam_term));
    if (filters.is_published !== undefined)
      conditions.push(eq(exams.is_published, filters.is_published));

    return conditions;
  }

  async findAll(schoolId: string, filters: FilterExamDto): Promise<Exam[]> {
    const conditions = this.buildConditions(schoolId, filters);
    const limit = filters.limit ?? 20;
    const offset = ((filters.page ?? 1) - 1) * limit;

    return this.db
      .select()
      .from(exams)
      .where(and(...conditions))
      .orderBy(exams.created_at)
      .limit(limit)
      .offset(offset);
  }

  async count(schoolId: string, filters: FilterExamDto): Promise<number> {
    const conditions = this.buildConditions(schoolId, filters);
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(exams)
      .where(and(...conditions));
    return Number(count);
  }

  async findById(id: string, schoolId: string): Promise<Exam | undefined> {
    const [row] = await this.db
      .select()
      .from(exams)
      .where(and(eq(exams.id, id), eq(exams.school_id, schoolId), eq(exams.deleted, false)));
    return row;
  }

  async create(data: NewExam): Promise<Exam> {
    const [row] = await this.db.insert(exams).values(data).returning();
    return row;
  }

  async update(id: string, schoolId: string, data: Partial<NewExam>): Promise<Exam> {
    const [row] = await this.db
      .update(exams)
      .set({ ...data, updated_at: new Date() })
      .where(and(eq(exams.id, id), eq(exams.school_id, schoolId)))
      .returning();
    return row;
  }

  async softDelete(id: string, schoolId: string): Promise<void> {
    await this.db
      .update(exams)
      .set({ deleted: true, is_enabled: false, updated_at: new Date() })
      .where(and(eq(exams.id, id), eq(exams.school_id, schoolId)));
  }
}
