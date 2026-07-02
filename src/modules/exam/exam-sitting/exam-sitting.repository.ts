import { Injectable, Inject } from '@nestjs/common';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../../database/drizzle/drizzle.provider';
import { ExamSittingPlan, NewExamSittingPlan } from './types/exam-sitting.types';
import { FilterSittingPlanDto } from './dto/exam-sitting.dto';
import { examSittingPlans } from '@database/drizzle/schema/exam-sitting-plan.schema';
import { students, studentAcademicInfo } from '@database/drizzle/schema/students.schema';
import { classes } from '@database/drizzle/schema/classes.schema';
import { sections } from '@database/drizzle/schema/sections.schema';
import { schools } from '@database/drizzle/schema/schools.schema';

export interface StudentForShuffle {
  student_id: string;
  exam_id: string;
  class_id: string;
  section_id: string | null;
  first_name: string;
  last_name: string | null;
  roll_number: string | null;
}

export interface RoomStudentRow {
  seat_number: number | null;
  student_name: string;
  roll_number: string | null;
  class_name: string;
  section_name: string | null;
}

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

  async softDeleteByExamIds(examIds: string[], schoolId: string): Promise<void> {
    if (examIds.length === 0) return;
    await this.db
      .update(examSittingPlans)
      .set({ deleted: true, updated_at: new Date() })
      .where(
        and(
          eq(examSittingPlans.school_id, schoolId),
          inArray(examSittingPlans.exam_id, examIds),
          eq(examSittingPlans.deleted, false),
        ),
      );
  }

  /** Fetch all students per exam (via studentAcademicInfo join) for shuffle logic */
  async findStudentsForExam(
    examId: string,
    classId: string,
    academicYearId: string,
    schoolId: string,
  ): Promise<StudentForShuffle[]> {
    const rows = await this.db
      .select({
        student_id: studentAcademicInfo.student_id,
        class_id: studentAcademicInfo.class_id,
        section_id: studentAcademicInfo.section_id,
        first_name: students.first_name,
        last_name: students.last_name,
        roll_number: studentAcademicInfo.roll_number,
      })
      .from(studentAcademicInfo)
      .innerJoin(students, eq(students.id, studentAcademicInfo.student_id))
      .where(
        and(
          eq(studentAcademicInfo.school_id, schoolId),
          eq(studentAcademicInfo.academic_year_id, academicYearId),
          eq(studentAcademicInfo.class_id, classId),
          eq(studentAcademicInfo.is_current, true),
          eq(studentAcademicInfo.deleted, false),
          eq(students.deleted, false),
        ),
      )
      .orderBy(studentAcademicInfo.section_id, students.first_name)
      .limit(2000);

    return rows.map((r) => ({ ...r, exam_id: examId }));
  }

  /** Seated student counts per room, broken down by class — for the master print. */
  async countSeatsByRoomAndClass(
    examId: string,
    schoolId: string,
  ): Promise<{ hall_detail_id: string; class_name: string; count: number }[]> {
    const rows = await this.db
      .select({
        hall_detail_id: examSittingPlans.hall_detail_id,
        class_name: classes.name,
        count: sql<number>`count(*)`,
      })
      .from(examSittingPlans)
      .innerJoin(
        studentAcademicInfo,
        eq(studentAcademicInfo.student_id, examSittingPlans.student_id),
      )
      .innerJoin(classes, eq(classes.id, studentAcademicInfo.class_id))
      .where(
        and(
          eq(examSittingPlans.school_id, schoolId),
          eq(examSittingPlans.exam_id, examId),
          eq(examSittingPlans.deleted, false),
          eq(studentAcademicInfo.is_current, true),
          eq(studentAcademicInfo.deleted, false),
        ),
      )
      .groupBy(examSittingPlans.hall_detail_id, classes.name);

    return rows.map((r) => ({ ...r, count: Number(r.count) }));
  }

  /** Seated student counts per room, broken down by class id — used to sync exam_schedules.hall_detail_id. */
  async countSeatsByRoomAndClassId(
    examId: string,
    schoolId: string,
  ): Promise<{ hall_detail_id: string; class_id: string; count: number }[]> {
    const rows = await this.db
      .select({
        hall_detail_id: examSittingPlans.hall_detail_id,
        class_id: studentAcademicInfo.class_id,
        count: sql<number>`count(*)`,
      })
      .from(examSittingPlans)
      .innerJoin(
        studentAcademicInfo,
        eq(studentAcademicInfo.student_id, examSittingPlans.student_id),
      )
      .where(
        and(
          eq(examSittingPlans.school_id, schoolId),
          eq(examSittingPlans.exam_id, examId),
          eq(examSittingPlans.deleted, false),
          eq(studentAcademicInfo.is_current, true),
          eq(studentAcademicInfo.deleted, false),
        ),
      )
      .groupBy(examSittingPlans.hall_detail_id, studentAcademicInfo.class_id);

    return rows.map((r) => ({ ...r, count: Number(r.count) }));
  }

  async findSchoolName(schoolId: string): Promise<string> {
    const [row] = await this.db
      .select({ name: schools.name })
      .from(schools)
      .where(eq(schools.id, schoolId))
      .limit(1);
    return row?.name ?? '';
  }

  /** Fetch seated students in a room (joined with student info) for PDF */
  async findRoomStudents(
    examIds: string[],
    hallDetailId: string,
    schoolId: string,
  ): Promise<RoomStudentRow[]> {
    if (examIds.length === 0) return [];
    const rows = await this.db
      .select({
        seat_number: examSittingPlans.seat_number,
        first_name: students.first_name,
        last_name: students.last_name,
        roll_number: examSittingPlans.roll_number,
        class_name: classes.name,
        section_name: sections.name,
      })
      .from(examSittingPlans)
      .innerJoin(
        studentAcademicInfo,
        eq(studentAcademicInfo.student_id, examSittingPlans.student_id),
      )
      .innerJoin(students, eq(students.id, examSittingPlans.student_id))
      .innerJoin(classes, eq(classes.id, studentAcademicInfo.class_id))
      .leftJoin(sections, eq(sections.id, studentAcademicInfo.section_id))
      .where(
        and(
          eq(examSittingPlans.school_id, schoolId),
          eq(examSittingPlans.hall_detail_id, hallDetailId),
          inArray(examSittingPlans.exam_id, examIds),
          eq(examSittingPlans.deleted, false),
          eq(studentAcademicInfo.is_current, true),
          eq(studentAcademicInfo.deleted, false),
          eq(students.deleted, false),
        ),
      )
      .orderBy(examSittingPlans.seat_number);

    return rows.map((r) => ({
      seat_number: r.seat_number,
      student_name: [r.first_name, r.last_name].filter(Boolean).join(' '),
      roll_number: r.roll_number,
      class_name: r.class_name,
      section_name: r.section_name ?? null,
    }));
  }
}
