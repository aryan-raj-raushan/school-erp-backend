import { Injectable, Inject } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../../database/drizzle/drizzle.provider';
import { ExamSittingPlan, NewExamSittingPlan } from './types/exam-sitting.types';
import { FilterSittingPlanDto } from './dto/exam-sitting.dto';
import { examSittingPlans } from '@database/drizzle/schema/exam-sitting-plan.schema';

@Injectable()
export class ExamSittingRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  private buildConditions(schoolId: string, filters: FilterSittingPlanDto) {
    const conditions = [
      eq(examSittingPlans.school_id, schoolId),
      eq(examSittingPlans.deleted, false),
    ];
    if (filters.academic_year_id)
      conditions.push(eq(examSittingPlans.academic_year_id, filters.academic_year_id));
    if (filters.exam_id) conditions.push(eq(examSittingPlans.exam_id, filters.exam_id));
    if (filters.hall_plan_id)
      conditions.push(eq(examSittingPlans.hall_plan_id, filters.hall_plan_id));
    if (filters.hall_detail_id)
      conditions.push(eq(examSittingPlans.hall_detail_id, filters.hall_detail_id));
    if (filters.student_id) conditions.push(eq(examSittingPlans.student_id, filters.student_id));
    return conditions;
  }

  async findAll(schoolId: string, filters: FilterSittingPlanDto): Promise<ExamSittingPlan[]> {
    const limit = filters.limit ?? 100;
    const offset = ((filters.page ?? 1) - 1) * limit;
    return this.db
      .select()
      .from(examSittingPlans)
      .where(and(...this.buildConditions(schoolId, filters)))
      .orderBy(examSittingPlans.seat_number)
      .limit(limit)
      .offset(offset);
  }

  async count(schoolId: string, filters: FilterSittingPlanDto): Promise<number> {
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(examSittingPlans)
      .where(and(...this.buildConditions(schoolId, filters)));
    return Number(count);
  }

  async findById(id: string, schoolId: string): Promise<ExamSittingPlan | undefined> {
    const [row] = await this.db
      .select()
      .from(examSittingPlans)
      .where(
        and(
          eq(examSittingPlans.id, id),
          eq(examSittingPlans.school_id, schoolId),
          eq(examSittingPlans.deleted, false),
        ),
      );
    return row;
  }

  /** Count how many students are already assigned to this room for this exam */
  async countSeatsOccupied(
    examId: string,
    hallDetailId: string,
    schoolId: string,
  ): Promise<number> {
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(examSittingPlans)
      .where(
        and(
          eq(examSittingPlans.exam_id, examId),
          eq(examSittingPlans.hall_detail_id, hallDetailId),
          eq(examSittingPlans.school_id, schoolId),
          eq(examSittingPlans.deleted, false),
        ),
      );
    return Number(count);
  }

  /** Check if student is already assigned a seat for this exam */
  async findByStudentAndExam(
    studentId: string,
    examId: string,
    schoolId: string,
  ): Promise<ExamSittingPlan | undefined> {
    const [row] = await this.db
      .select()
      .from(examSittingPlans)
      .where(
        and(
          eq(examSittingPlans.student_id, studentId),
          eq(examSittingPlans.exam_id, examId),
          eq(examSittingPlans.school_id, schoolId),
          eq(examSittingPlans.deleted, false),
        ),
      );
    return row;
  }

  async createMany(data: NewExamSittingPlan[]): Promise<ExamSittingPlan[]> {
    return this.db.insert(examSittingPlans).values(data).returning();
  }

  async create(data: NewExamSittingPlan): Promise<ExamSittingPlan> {
    const [row] = await this.db.insert(examSittingPlans).values(data).returning();
    return row;
  }

  async update(
    id: string,
    schoolId: string,
    data: Partial<NewExamSittingPlan>,
  ): Promise<ExamSittingPlan> {
    const [row] = await this.db
      .update(examSittingPlans)
      .set({ ...data, updated_at: new Date() })
      .where(and(eq(examSittingPlans.id, id), eq(examSittingPlans.school_id, schoolId)))
      .returning();
    return row;
  }

  async softDelete(id: string, schoolId: string): Promise<void> {
    await this.db
      .update(examSittingPlans)
      .set({ deleted: true, updated_at: new Date() })
      .where(and(eq(examSittingPlans.id, id), eq(examSittingPlans.school_id, schoolId)));
  }
}
