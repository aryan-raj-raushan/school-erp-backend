import { Injectable, Inject } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { examHallDetails } from '@database/drizzle/schema';
import { DRIZZLE_ORM } from '../../../database/drizzle/drizzle.constants';
import type { DrizzleDB } from '../../../database/drizzle/drizzle.provider';
import { ExamHallDetail, NewExamHallDetail } from './types/exam-hall.types';
import { FilterHallDetailDto } from './dto/exam-hall.dto';

@Injectable()
export class ExamHallRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  private buildDetailConditions(schoolId: string, filters: FilterHallDetailDto) {
    const conditions = [
      eq(examHallDetails.school_id, schoolId),
      eq(examHallDetails.deleted, false),
    ];
    if (filters.is_enabled !== undefined)
      conditions.push(eq(examHallDetails.is_enabled, Boolean(filters.is_enabled)));
    return conditions;
  }

  async findAllDetails(schoolId: string, filters: FilterHallDetailDto): Promise<ExamHallDetail[]> {
    const limit = filters.limit ?? 50;
    const offset = ((filters.page ?? 1) - 1) * limit;
    return this.db
      .select()
      .from(examHallDetails)
      .where(and(...this.buildDetailConditions(schoolId, filters)))
      .limit(limit)
      .offset(offset);
  }

  async countDetails(schoolId: string, filters: FilterHallDetailDto): Promise<number> {
    const rows = await this.db
      .select({ id: examHallDetails.id })
      .from(examHallDetails)
      .where(and(...this.buildDetailConditions(schoolId, filters)));
    return rows.length;
  }

  async findDetailById(id: string, schoolId: string): Promise<ExamHallDetail | undefined> {
    const [row] = await this.db
      .select()
      .from(examHallDetails)
      .where(
        and(
          eq(examHallDetails.id, id),
          eq(examHallDetails.school_id, schoolId),
          eq(examHallDetails.deleted, false),
        ),
      );
    return row;
  }

  async createDetail(data: NewExamHallDetail): Promise<ExamHallDetail> {
    const [row] = await this.db.insert(examHallDetails).values(data).returning();
    return row;
  }

  async updateDetail(
    id: string,
    schoolId: string,
    data: Partial<ExamHallDetail>,
  ): Promise<ExamHallDetail> {
    const [row] = await this.db
      .update(examHallDetails)
      .set({ ...data, updated_at: new Date() })
      .where(and(eq(examHallDetails.id, id), eq(examHallDetails.school_id, schoolId)))
      .returning();
    return row;
  }

  async softDeleteDetail(id: string, schoolId: string): Promise<void> {
    await this.db
      .update(examHallDetails)
      .set({ deleted: true, updated_at: new Date() })
      .where(and(eq(examHallDetails.id, id), eq(examHallDetails.school_id, schoolId)));
  }
}
