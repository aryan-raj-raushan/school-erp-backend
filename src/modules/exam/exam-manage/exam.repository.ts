import { Injectable, Inject, ConflictException } from '@nestjs/common';
import { eq, and, ne, sql, inArray, lte, gte, like } from 'drizzle-orm';
import { Exam, NewExam, NewExamClass, ExamWithClasses } from './types/exam.types';
import { FilterExamDto } from './dto/exam.dto';
import { DRIZZLE_ORM } from '@database/drizzle/drizzle.constants';
import { exams } from '@database/drizzle/schema/exam.schema';
import { examClasses } from '@database/drizzle/schema/exam-classes.schema';
import { classes } from '@database/drizzle/schema/classes.schema';
import { DrizzleDB } from '@database/drizzle/drizzle.provider';
import { generateId } from '../../../utils/uuid.utils';

@Injectable()
export class ExamRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  private buildConditions(schoolId: string, filters: FilterExamDto) {
    const conditions = [eq(exams.school_id, schoolId), eq(exams.deleted, false)];

    if (filters.academic_year_id)
      conditions.push(eq(exams.academic_year_id, filters.academic_year_id));
    if (filters.class_id) {
      // exams no longer carry class_id directly — a class "belongs" to an
      // exam via the exam_classes junction table.
      const examIdsForClass = this.db
        .select({ exam_id: examClasses.exam_id })
        .from(examClasses)
        .where(
          and(eq(examClasses.school_id, schoolId), eq(examClasses.class_id, filters.class_id)),
        );
      conditions.push(inArray(exams.id, examIdsForClass));
    }
    if (filters.exam_term) conditions.push(eq(exams.exam_term, filters.exam_term));
    if (filters.is_published !== undefined)
      conditions.push(eq(exams.is_published, filters.is_published));

    return conditions;
  }

  /** Attach participating class_ids to a batch of exam rows in one query. */
  private async attachClassIds(rows: Exam[], schoolId: string): Promise<ExamWithClasses[]> {
    if (rows.length === 0) return [];
    const examIds = rows.map((r) => r.id);
    const links = await this.db
      .select({ exam_id: examClasses.exam_id, class_id: examClasses.class_id })
      .from(examClasses)
      .where(and(eq(examClasses.school_id, schoolId), inArray(examClasses.exam_id, examIds)));

    const byExam = new Map<string, string[]>();
    for (const link of links) {
      const list = byExam.get(link.exam_id) ?? [];
      list.push(link.class_id);
      byExam.set(link.exam_id, list);
    }
    return rows.map((r) => ({ ...r, class_ids: byExam.get(r.id) ?? [] }));
  }

  async findAll(schoolId: string, filters: FilterExamDto): Promise<ExamWithClasses[]> {
    const conditions = this.buildConditions(schoolId, filters);
    const limit = filters.limit ?? 20;
    const offset = ((filters.page ?? 1) - 1) * limit;

    const rows = await this.db
      .select()
      .from(exams)
      .where(and(...conditions))
      .orderBy(exams.created_at)
      .limit(limit)
      .offset(offset);

    return this.attachClassIds(rows, schoolId);
  }

  async count(schoolId: string, filters: FilterExamDto): Promise<number> {
    const conditions = this.buildConditions(schoolId, filters);
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(exams)
      .where(and(...conditions));
    return Number(count);
  }

  async findById(id: string, schoolId: string): Promise<ExamWithClasses | undefined> {
    const [row] = await this.db
      .select()
      .from(exams)
      .where(and(eq(exams.id, id), eq(exams.school_id, schoolId), eq(exams.deleted, false)));
    if (!row) return undefined;
    const [enriched] = await this.attachClassIds([row], schoolId);
    return enriched;
  }

  /** Translates the `exams_code_school_unique` violation into a specific, actionable message. */
  private rethrowIfDuplicateCode(error: unknown, code: string): never {
    const pgError = error as Error & { code?: string; constraint?: string };
    if (pgError?.code === '23505' && pgError.constraint === 'exams_code_school_unique') {
      throw new ConflictException(
        `An exam with code '${code}' already exists for this academic year — edit the exam code or choose different dates/term`,
      );
    }
    throw error;
  }

  async create(data: NewExam): Promise<Exam> {
    try {
      const [row] = await this.db.insert(exams).values(data).returning();
      return row;
    } catch (error) {
      this.rethrowIfDuplicateCode(error, data.code ?? '');
    }
  }

  async update(id: string, schoolId: string, data: Partial<NewExam>): Promise<Exam> {
    try {
      const [row] = await this.db
        .update(exams)
        .set({ ...data, updated_at: new Date() })
        .where(and(eq(exams.id, id), eq(exams.school_id, schoolId)))
        .returning();
      return row;
    } catch (error) {
      this.rethrowIfDuplicateCode(error, data.code ?? '');
    }
  }

  /**
   * Other non-deleted exams sharing at least one class with the given
   * class_ids whose [start_date, end_date] window intersects the given
   * range — used to block overlapping exam timelines for the same class.
   */
  async findOverlapping(
    schoolId: string,
    academicYearId: string,
    classIds: string[],
    startDate: string,
    endDate: string,
    excludeExamId?: string,
  ): Promise<Exam[]> {
    if (classIds.length === 0) return [];
    const examIdsForClasses = this.db
      .select({ exam_id: examClasses.exam_id })
      .from(examClasses)
      .where(
        and(eq(examClasses.school_id, schoolId), inArray(examClasses.class_id, classIds)),
      );

    const conditions = [
      eq(exams.school_id, schoolId),
      eq(exams.academic_year_id, academicYearId),
      eq(exams.deleted, false),
      inArray(exams.id, examIdsForClasses),
      lte(exams.start_date, endDate),
      gte(exams.end_date, startDate),
    ];
    if (excludeExamId) conditions.push(ne(exams.id, excludeExamId));

    return this.db
      .select()
      .from(exams)
      .where(and(...conditions));
  }

  async softDelete(id: string, schoolId: string): Promise<void> {
    await this.db
      .update(exams)
      .set({ deleted: true, is_enabled: false, updated_at: new Date() })
      .where(and(eq(exams.id, id), eq(exams.school_id, schoolId)));
  }

  async restore(id: string, schoolId: string): Promise<Exam> {
    const [row] = await this.db
      .update(exams)
      .set({ deleted: false, is_enabled: true, updated_at: new Date() })
      .where(and(eq(exams.id, id), eq(exams.school_id, schoolId)))
      .returning();
    return row;
  }

  /** Find including soft-deleted rows — used by restore to confirm the row exists. */
  async findByIdIncludingDeleted(id: string, schoolId: string): Promise<Exam | undefined> {
    const [row] = await this.db
      .select()
      .from(exams)
      .where(and(eq(exams.id, id), eq(exams.school_id, schoolId)));
    return row;
  }

  /** Replace the full set of classes participating in an exam. */
  async replaceExamClasses(
    examId: string,
    schoolId: string,
    academicYearId: string,
    classIds: string[],
  ): Promise<void> {
    await this.db.delete(examClasses).where(
      and(eq(examClasses.exam_id, examId), eq(examClasses.school_id, schoolId)),
    );
    if (classIds.length === 0) return;
    const rows: NewExamClass[] = classIds.map((classId) => ({
      id: generateId(),
      school_id: schoolId,
      exam_id: examId,
      class_id: classId,
      academic_year_id: academicYearId,
    }));
    await this.db.insert(examClasses).values(rows);
  }

  async getClassIdsForExam(examId: string, schoolId: string): Promise<string[]> {
    const rows = await this.db
      .select({ class_id: examClasses.class_id })
      .from(examClasses)
      .where(and(eq(examClasses.exam_id, examId), eq(examClasses.school_id, schoolId)));
    return rows.map((r) => r.class_id);
  }

  /** Live exam codes in this academic year starting with `prefix` — used to derive a free auto-generated code. */
  async findCodesWithPrefix(
    schoolId: string,
    academicYearId: string,
    prefix: string,
  ): Promise<Set<string>> {
    const rows = await this.db
      .select({ code: exams.code })
      .from(exams)
      .where(
        and(
          eq(exams.school_id, schoolId),
          eq(exams.academic_year_id, academicYearId),
          eq(exams.deleted, false),
          like(exams.code, `${prefix}%`),
        ),
      );
    return new Set(rows.map((r) => r.code).filter((c): c is string => c !== null));
  }

  async findClassNames(schoolId: string, classIds: string[]): Promise<Map<string, string>> {
    if (classIds.length === 0) return new Map();
    const rows = await this.db
      .select({ id: classes.id, name: classes.name })
      .from(classes)
      .where(and(eq(classes.school_id, schoolId), inArray(classes.id, classIds)));
    return new Map(rows.map((r) => [r.id, r.name]));
  }
}
