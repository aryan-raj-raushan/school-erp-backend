import { Injectable, Inject } from '@nestjs/common';
import { eq, and, asc } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../../database/drizzle/drizzle.provider';
import { ExamGrading, NewExamGrading } from './types/exam-grading.types';
import { examGrading } from '@database/drizzle/schema/exam-grading.schema';

@Injectable()
export class ExamGradingRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  async findAll(schoolId: string): Promise<ExamGrading[]> {
    return this.db
      .select()
      .from(examGrading)
      .where(
        and(
          eq(examGrading.school_id, schoolId),
          eq(examGrading.deleted, false),
          eq(examGrading.is_enabled, true),
        ),
      )
      .orderBy(asc(examGrading.sequence_index));
  }

  async findAllIncludeDisabled(schoolId: string): Promise<ExamGrading[]> {
    return this.db
      .select()
      .from(examGrading)
      .where(and(eq(examGrading.school_id, schoolId), eq(examGrading.deleted, false)))
      .orderBy(asc(examGrading.sequence_index));
  }

  async findById(id: string, schoolId: string): Promise<ExamGrading | undefined> {
    const [row] = await this.db
      .select()
      .from(examGrading)
      .where(
        and(
          eq(examGrading.id, id),
          eq(examGrading.school_id, schoolId),
          eq(examGrading.deleted, false),
        ),
      );
    return row;
  }

  async create(data: NewExamGrading): Promise<ExamGrading> {
    const [row] = await this.db.insert(examGrading).values(data).returning();
    return row;
  }

  async update(id: string, schoolId: string, data: Partial<NewExamGrading>): Promise<ExamGrading> {
    const [row] = await this.db
      .update(examGrading)
      .set({ ...data, updated_at: new Date() })
      .where(and(eq(examGrading.id, id), eq(examGrading.school_id, schoolId)))
      .returning();
    return row;
  }

  async softDelete(id: string, schoolId: string): Promise<void> {
    await this.db
      .update(examGrading)
      .set({ deleted: true, is_enabled: false, updated_at: new Date() })
      .where(and(eq(examGrading.id, id), eq(examGrading.school_id, schoolId)));
  }
}
