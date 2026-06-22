import { Injectable, Inject } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../../database/drizzle/drizzle.provider';
import {
  ExamHallPlan,
  NewExamHallPlan,
  ExamHallDetail,
  NewExamHallDetail,
} from './types/exam-hall.types';
import { FilterHallPlanDto, FilterHallDetailDto } from './dto/exam-hall.dto';
import { examHallPlans } from '@database/drizzle/schema/exam-hall-plan.schema';
import { examHallDetails } from '@database/drizzle/schema/exam-hall-details.schema';

@Injectable()
export class ExamHallRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  // ── Hall Plans ────────────────────────────────────────────────────────────

  async findAllPlans(schoolId: string, filters: FilterHallPlanDto): Promise<ExamHallPlan[]> {
    const conditions = [eq(examHallPlans.school_id, schoolId), eq(examHallPlans.deleted, false)];
    if (filters.is_enabled !== undefined)
      conditions.push(eq(examHallPlans.is_enabled, filters.is_enabled));

    const limit = filters.limit ?? 20;
    const offset = ((filters.page ?? 1) - 1) * limit;

    return this.db
      .select()
      .from(examHallPlans)
      .where(and(...conditions))
      .orderBy(examHallPlans.created_at)
      .limit(limit)
      .offset(offset);
  }

  async countPlans(schoolId: string, filters: FilterHallPlanDto): Promise<number> {
    const conditions = [eq(examHallPlans.school_id, schoolId), eq(examHallPlans.deleted, false)];
    if (filters.is_enabled !== undefined)
      conditions.push(eq(examHallPlans.is_enabled, filters.is_enabled));
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(examHallPlans)
      .where(and(...conditions));
    return Number(count);
  }

  async findPlanById(id: string, schoolId: string): Promise<ExamHallPlan | undefined> {
    const [row] = await this.db
      .select()
      .from(examHallPlans)
      .where(
        and(
          eq(examHallPlans.id, id),
          eq(examHallPlans.school_id, schoolId),
          eq(examHallPlans.deleted, false),
        ),
      );
    return row;
  }

  async createPlan(data: NewExamHallPlan): Promise<ExamHallPlan> {
    const [row] = await this.db.insert(examHallPlans).values(data).returning();
    return row;
  }

  async updatePlan(
    id: string,
    schoolId: string,
    data: Partial<NewExamHallPlan>,
  ): Promise<ExamHallPlan> {
    const [row] = await this.db
      .update(examHallPlans)
      .set({ ...data, updated_at: new Date() })
      .where(and(eq(examHallPlans.id, id), eq(examHallPlans.school_id, schoolId)))
      .returning();
    return row;
  }

  async softDeletePlan(id: string, schoolId: string): Promise<void> {
    await this.db
      .update(examHallPlans)
      .set({ deleted: true, is_enabled: false, updated_at: new Date() })
      .where(and(eq(examHallPlans.id, id), eq(examHallPlans.school_id, schoolId)));
  }

  // ── Hall Details ──────────────────────────────────────────────────────────

  async findAllDetails(schoolId: string, filters: FilterHallDetailDto): Promise<ExamHallDetail[]> {
    const conditions = [
      eq(examHallDetails.school_id, schoolId),
      eq(examHallDetails.deleted, false),
    ];
    if (filters.hall_plan_id)
      conditions.push(eq(examHallDetails.hall_plan_id, filters.hall_plan_id));
    if (filters.is_enabled !== undefined)
      conditions.push(eq(examHallDetails.is_enabled, filters.is_enabled));

    const limit = filters.limit ?? 50;
    const offset = ((filters.page ?? 1) - 1) * limit;

    return this.db
      .select()
      .from(examHallDetails)
      .where(and(...conditions))
      .orderBy(examHallDetails.room_name)
      .limit(limit)
      .offset(offset);
  }

  async countDetails(schoolId: string, filters: FilterHallDetailDto): Promise<number> {
    const conditions = [
      eq(examHallDetails.school_id, schoolId),
      eq(examHallDetails.deleted, false),
    ];
    if (filters.hall_plan_id)
      conditions.push(eq(examHallDetails.hall_plan_id, filters.hall_plan_id));
    if (filters.is_enabled !== undefined)
      conditions.push(eq(examHallDetails.is_enabled, filters.is_enabled));

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(examHallDetails)
      .where(and(...conditions));
    return Number(count);
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
    data: Partial<NewExamHallDetail>,
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
      .set({ deleted: true, is_enabled: false, updated_at: new Date() })
      .where(and(eq(examHallDetails.id, id), eq(examHallDetails.school_id, schoolId)));
  }

  /** Used for capacity validation in sitting plan */
  async countSeatsUsed(): Promise<number> {
    // This is called from sitting plan service — returns occupied count
    // Kept here for co-location with hall data access
    return 0; // placeholder; actual query is in sitting plan repo
  }
}
