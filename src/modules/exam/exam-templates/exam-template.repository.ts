import { Injectable, Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../../database/drizzle/drizzle.provider';
import { ExamTemplate, NewExamTemplate } from './types/exam-template.types';
import { examTemplates } from '@database/drizzle/schema/exam-templates.schema';

@Injectable()
export class ExamTemplateRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  async findAll(schoolId: string): Promise<ExamTemplate[]> {
    return this.db
      .select()
      .from(examTemplates)
      .where(and(eq(examTemplates.school_id, schoolId), eq(examTemplates.deleted, false)));
  }

  async findById(id: string, schoolId: string): Promise<ExamTemplate | undefined> {
    const [row] = await this.db
      .select()
      .from(examTemplates)
      .where(
        and(
          eq(examTemplates.id, id),
          eq(examTemplates.school_id, schoolId),
          eq(examTemplates.deleted, false),
        ),
      );
    return row;
  }

  async create(data: NewExamTemplate): Promise<ExamTemplate> {
    const [row] = await this.db.insert(examTemplates).values(data).returning();
    return row;
  }

  async update(
    id: string,
    schoolId: string,
    data: Partial<NewExamTemplate>,
  ): Promise<ExamTemplate> {
    const [row] = await this.db
      .update(examTemplates)
      .set({ ...data, updated_at: new Date() })
      .where(and(eq(examTemplates.id, id), eq(examTemplates.school_id, schoolId)))
      .returning();
    return row;
  }

  async softDelete(id: string, schoolId: string): Promise<void> {
    await this.db
      .update(examTemplates)
      .set({ deleted: true, is_active: false, updated_at: new Date() })
      .where(and(eq(examTemplates.id, id), eq(examTemplates.school_id, schoolId)));
  }
}
