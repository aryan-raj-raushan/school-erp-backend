import { Injectable, Inject } from '@nestjs/common';
import { and, eq, inArray, ilike, or, sql, desc } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import * as schema from '../../database/drizzle/schema';
import { examResults, reportCards } from '../../database/drizzle/schema';
import {
  ExamResult,
  NewExamResult,
  ReportCard,
  NewReportCard,
  ExamResultWithStudent,
  ReportCardListRow,
} from './types/exam-result.types';
import { FilterExamResultDto, FilterReportCardDto } from './dto/exam-result.dto';

@Injectable()
export class ExamResultsRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  // ─── Exam Results ─────────────────────────────────────────────────────────

  async upsertBulk(rows: NewExamResult[]): Promise<ExamResult[]> {
    return this.db
      .insert(examResults)
      .values(rows)
      .onConflictDoUpdate({
        target: [examResults.student_id, examResults.exam_schedule_id],
        set: {
          marks_obtained: sql`excluded.marks_obtained`,
          is_absent: sql`excluded.is_absent`,
          updated_at: new Date(),
          updated_by: sql`excluded.updated_by`,
        },
      })
      .returning();
  }

  async findResultsByExam(
    schoolId: string,
    filters: FilterExamResultDto,
  ): Promise<ExamResultWithStudent[]> {
    const conditions = [eq(examResults.school_id, schoolId), eq(examResults.deleted, false)];

    if (filters.exam_id) conditions.push(eq(examResults.exam_id, filters.exam_id));
    if (filters.class_id) conditions.push(eq(examResults.class_id, filters.class_id));
    if (filters.section_id) conditions.push(eq(examResults.section_id, filters.section_id));
    if (filters.academic_year_id)
      conditions.push(eq(examResults.academic_year_id, filters.academic_year_id));
    if (filters.student_id) conditions.push(eq(examResults.student_id, filters.student_id));

    const rows = await this.db
      .select({
        id: examResults.id,
        student_id: examResults.student_id,
        student_first_name: schema.students.first_name,
        student_last_name: schema.students.last_name,
        roll_number: schema.studentAcademicInfo.roll_number,
        subject_id: examResults.subject_id,
        subject_name: examResults.exam_schedule_id, // will be joined
        subject_type: schema.examSchedules.subject_type,
        schedule_subject_name: schema.examSchedules.subject_name,
        exam_schedule_id: examResults.exam_schedule_id,
        marks_obtained: examResults.marks_obtained,
        max_marks: examResults.max_marks,
        is_absent: examResults.is_absent,
        is_published: examResults.is_published,
      })
      .from(examResults)
      .innerJoin(schema.students, eq(examResults.student_id, schema.students.id))
      .innerJoin(schema.examSchedules, eq(examResults.exam_schedule_id, schema.examSchedules.id))
      .leftJoin(
        schema.studentAcademicInfo,
        and(
          eq(schema.studentAcademicInfo.student_id, examResults.student_id),
          eq(schema.studentAcademicInfo.academic_year_id, examResults.academic_year_id),
          eq(schema.studentAcademicInfo.is_current, true),
        ),
      )
      .where(
        filters.search
          ? and(
              ...conditions,
              or(
                ilike(schema.students.first_name, `%${filters.search}%`),
                ilike(schema.students.last_name, `%${filters.search}%`),
              ),
            )
          : and(...conditions),
      )
      .orderBy(schema.examSchedules.subject_name, schema.students.first_name);

    return rows.map((r) => ({
      id: r.id,
      student_id: r.student_id,
      student_name: `${r.student_first_name} ${r.student_last_name ?? ''}`.trim(),
      roll_number: r.roll_number,
      subject_id: r.subject_id,
      subject_name: r.schedule_subject_name,
      subject_type: r.subject_type,
      exam_schedule_id: r.exam_schedule_id,
      marks_obtained: r.marks_obtained,
      max_marks: r.max_marks,
      is_absent: r.is_absent,
      is_published: r.is_published,
    }));
  }

  async publishResults(
    schoolId: string,
    examId: string,
    isPublished: boolean,
    filters: { classId?: string; sectionId?: string },
  ): Promise<void> {
    const conditions = [
      eq(examResults.school_id, schoolId),
      eq(examResults.exam_id, examId),
      eq(examResults.deleted, false),
    ];
    if (filters.classId) conditions.push(eq(examResults.class_id, filters.classId));
    if (filters.sectionId) conditions.push(eq(examResults.section_id, filters.sectionId));

    await this.db
      .update(examResults)
      .set({ is_published: isPublished, updated_at: new Date() })
      .where(and(...conditions));
  }

  async findResultsForReportCard(
    schoolId: string,
    examId: string,
    studentIds: string[],
    academicYearId: string,
  ) {
    return this.db
      .select({
        student_id: examResults.student_id,
        subject_id: examResults.subject_id,
        subject_name: schema.examSchedules.subject_name,
        subject_type: schema.examSchedules.subject_type,
        exam_schedule_id: examResults.exam_schedule_id,
        marks_obtained: examResults.marks_obtained,
        max_marks: examResults.max_marks,
        is_absent: examResults.is_absent,
        parent_schedule_id: schema.examSchedules.parent_schedule_id,
      })
      .from(examResults)
      .innerJoin(schema.examSchedules, eq(examResults.exam_schedule_id, schema.examSchedules.id))
      .where(
        and(
          eq(examResults.school_id, schoolId),
          eq(examResults.exam_id, examId),
          eq(examResults.academic_year_id, academicYearId),
          eq(examResults.deleted, false),
          inArray(examResults.student_id, studentIds),
        ),
      );
  }

  async softDeleteByExam(schoolId: string, examId: string): Promise<void> {
    await this.db
      .update(examResults)
      .set({ deleted: true, updated_at: new Date() })
      .where(and(eq(examResults.school_id, schoolId), eq(examResults.exam_id, examId)));
  }

  // ─── Report Cards ─────────────────────────────────────────────────────────

  async upsertReportCard(data: NewReportCard): Promise<ReportCard> {
    const [row] = await this.db
      .insert(reportCards)
      .values(data)
      .onConflictDoUpdate({
        target: [reportCards.school_id, reportCards.exam_id, reportCards.student_id],
        set: {
          pdf_url: sql`excluded.pdf_url`,
          pdf_s3_key: sql`excluded.pdf_s3_key`,
          total_marks: sql`excluded.total_marks`,
          marks_obtained: sql`excluded.marks_obtained`,
          percentage: sql`excluded.percentage`,
          grade: sql`excluded.grade`,
          rank: sql`excluded.rank`,
          remarks: sql`excluded.remarks`,
          status: sql`excluded.status`,
          updated_at: new Date(),
        },
      })
      .returning();
    return row;
  }

  async findReportCards(
    schoolId: string,
    filters: FilterReportCardDto,
  ): Promise<ReportCardListRow[]> {
    const conditions = [eq(reportCards.school_id, schoolId), eq(reportCards.deleted, false)];
    if (filters.exam_id) conditions.push(eq(reportCards.exam_id, filters.exam_id));
    if (filters.class_id) conditions.push(eq(reportCards.class_id, filters.class_id));
    if (filters.section_id) conditions.push(eq(reportCards.section_id, filters.section_id));
    if (filters.academic_year_id)
      conditions.push(eq(reportCards.academic_year_id, filters.academic_year_id));
    if (filters.student_id) conditions.push(eq(reportCards.student_id, filters.student_id));

    const limit = filters.limit ?? 20;
    const offset = ((filters.page ?? 1) - 1) * limit;

    const rows = await this.db
      .select({
        id: reportCards.id,
        student_id: reportCards.student_id,
        student_first_name: schema.students.first_name,
        student_last_name: schema.students.last_name,
        roll_number: schema.studentAcademicInfo.roll_number,
        class_name: schema.classes.name,
        section_name: schema.sections.name,
        academic_year_name: schema.academicYears.name,
        exam_name: schema.exams.exam_name,
        exam_term: schema.exams.exam_term,
        total_marks: reportCards.total_marks,
        marks_obtained: reportCards.marks_obtained,
        percentage: reportCards.percentage,
        grade: reportCards.grade,
        rank: reportCards.rank,
        status: reportCards.status,
        is_published: reportCards.is_published,
        pdf_url: reportCards.pdf_url,
        created_at: reportCards.created_at,
      })
      .from(reportCards)
      .innerJoin(schema.students, eq(reportCards.student_id, schema.students.id))
      .leftJoin(schema.classes, eq(reportCards.class_id, schema.classes.id))
      .leftJoin(schema.sections, eq(reportCards.section_id, schema.sections.id))
      .leftJoin(schema.academicYears, eq(reportCards.academic_year_id, schema.academicYears.id))
      .leftJoin(schema.exams, eq(reportCards.exam_id, schema.exams.id))
      .leftJoin(
        schema.studentAcademicInfo,
        and(
          eq(schema.studentAcademicInfo.student_id, reportCards.student_id),
          eq(schema.studentAcademicInfo.academic_year_id, reportCards.academic_year_id),
          eq(schema.studentAcademicInfo.is_current, true),
        ),
      )
      .where(
        filters.search
          ? and(
              ...conditions,
              or(
                ilike(schema.students.first_name, `%${filters.search}%`),
                ilike(schema.students.last_name, `%${filters.search}%`),
              ),
            )
          : and(...conditions),
      )
      .orderBy(desc(reportCards.created_at))
      .limit(limit)
      .offset(offset);

    return rows.map((r) => ({
      ...r,
      student_name: `${r.student_first_name} ${r.student_last_name ?? ''}`.trim(),
    }));
  }

  async countReportCards(schoolId: string, filters: FilterReportCardDto): Promise<number> {
    const conditions = [eq(reportCards.school_id, schoolId), eq(reportCards.deleted, false)];
    if (filters.exam_id) conditions.push(eq(reportCards.exam_id, filters.exam_id));
    if (filters.class_id) conditions.push(eq(reportCards.class_id, filters.class_id));
    if (filters.section_id) conditions.push(eq(reportCards.section_id, filters.section_id));
    if (filters.academic_year_id)
      conditions.push(eq(reportCards.academic_year_id, filters.academic_year_id));
    if (filters.student_id) conditions.push(eq(reportCards.student_id, filters.student_id));

    const [{ total }] = await this.db
      .select({ total: sql<number>`count(*)` })
      .from(reportCards)
      .innerJoin(schema.students, eq(reportCards.student_id, schema.students.id))
      .where(
        filters.search
          ? and(
              ...conditions,
              or(
                ilike(schema.students.first_name, `%${filters.search}%`),
                ilike(schema.students.last_name, `%${filters.search}%`),
              ),
            )
          : and(...conditions),
      );
    return Number(total);
  }

  async findReportCardById(id: string, schoolId: string): Promise<ReportCard | undefined> {
    const [row] = await this.db
      .select()
      .from(reportCards)
      .where(
        and(
          eq(reportCards.id, id),
          eq(reportCards.school_id, schoolId),
          eq(reportCards.deleted, false),
        ),
      );
    return row;
  }

  async publishReportCards(
    schoolId: string,
    isPublished: boolean,
    filters: { examId: string; classId?: string; sectionId?: string; studentId?: string },
  ): Promise<void> {
    const conditions = [
      eq(reportCards.school_id, schoolId),
      eq(reportCards.exam_id, filters.examId),
      eq(reportCards.deleted, false),
    ];
    if (filters.classId) conditions.push(eq(reportCards.class_id, filters.classId));
    if (filters.sectionId) conditions.push(eq(reportCards.section_id, filters.sectionId));
    if (filters.studentId) conditions.push(eq(reportCards.student_id, filters.studentId));

    await this.db
      .update(reportCards)
      .set({ is_published: isPublished, updated_at: new Date() })
      .where(and(...conditions));
  }

  async updateReportCardPdf(
    id: string,
    schoolId: string,
    data: { pdf_url: string; pdf_s3_key: string; status: string },
  ): Promise<ReportCard> {
    const [row] = await this.db
      .update(reportCards)
      .set({ ...data, updated_at: new Date() })
      .where(and(eq(reportCards.id, id), eq(reportCards.school_id, schoolId)))
      .returning();
    return row;
  }

  async softDeleteReportCard(id: string, schoolId: string): Promise<void> {
    await this.db
      .update(reportCards)
      .set({ deleted: true, updated_at: new Date() })
      .where(and(eq(reportCards.id, id), eq(reportCards.school_id, schoolId)));
  }

  // ─── Supporting lookups ───────────────────────────────────────────────────

  async findExamWithDetails(examId: string, schoolId: string) {
    const [row] = await this.db
      .select({
        id: schema.exams.id,
        exam_name: schema.exams.exam_name,
        exam_term: schema.exams.exam_term,
        class_id: schema.exams.class_id,
        academic_year_id: schema.exams.academic_year_id,
        class_name: schema.classes.name,
        academic_year_name: schema.academicYears.name,
        is_published: schema.exams.is_published,
      })
      .from(schema.exams)
      .leftJoin(schema.classes, eq(schema.exams.class_id, schema.classes.id))
      .leftJoin(schema.academicYears, eq(schema.exams.academic_year_id, schema.academicYears.id))
      .where(
        and(
          eq(schema.exams.id, examId),
          eq(schema.exams.school_id, schoolId),
          eq(schema.exams.deleted, false),
        ),
      );
    return row;
  }

  async findStudentsByClassSection(
    schoolId: string,
    classId: string,
    academicYearId: string,
    sectionId?: string,
    studentId?: string,
  ) {
    const conditions = [
      eq(schema.studentAcademicInfo.school_id, schoolId),
      eq(schema.studentAcademicInfo.class_id, classId),
      eq(schema.studentAcademicInfo.academic_year_id, academicYearId),
      eq(schema.studentAcademicInfo.is_current, true),
      eq(schema.studentAcademicInfo.deleted, false),
      eq(schema.students.deleted, false),
    ];
    if (sectionId) conditions.push(eq(schema.studentAcademicInfo.section_id, sectionId));
    if (studentId) conditions.push(eq(schema.students.id, studentId));

    return this.db
      .select({
        student_id: schema.students.id,
        first_name: schema.students.first_name,
        last_name: schema.students.last_name,
        date_of_birth: schema.students.date_of_birth,
        profile_image: schema.students.profile_image,
        aadhaar_number: schema.students.aadhaar_number,
        roll_number: schema.studentAcademicInfo.roll_number,
        admission_number: schema.studentAcademicInfo.admission_number,
        registration_number: schema.studentAcademicInfo.registration_number,
        section_id: schema.studentAcademicInfo.section_id,
      })
      .from(schema.studentAcademicInfo)
      .innerJoin(schema.students, eq(schema.studentAcademicInfo.student_id, schema.students.id))
      .where(and(...conditions))
      .orderBy(schema.studentAcademicInfo.roll_number);
  }

  async findParentsByStudentIds(studentIds: string[]) {
    return this.db
      .select({
        student_id: schema.studentParents.student_id,
        relation: schema.studentParents.relation,
        first_name: schema.studentParents.first_name,
        last_name: schema.studentParents.last_name,
        is_primary: schema.studentParents.is_primary,
      })
      .from(schema.studentParents)
      .where(
        and(
          inArray(schema.studentParents.student_id, studentIds),
          eq(schema.studentParents.deleted, false),
        ),
      );
  }

  async findExamSchedules(schoolId: string, examId: string) {
    return this.db
      .select()
      .from(schema.examSchedules)
      .where(
        and(
          eq(schema.examSchedules.school_id, schoolId),
          eq(schema.examSchedules.exam_id, examId),
          eq(schema.examSchedules.deleted, false),
          eq(schema.examSchedules.is_enabled, true),
        ),
      )
      .orderBy(schema.examSchedules.exam_date);
  }

  async findGradingBySchool(schoolId: string) {
    return this.db
      .select()
      .from(schema.examGrading)
      .where(
        and(
          eq(schema.examGrading.school_id, schoolId),
          eq(schema.examGrading.deleted, false),
          eq(schema.examGrading.is_enabled, true),
        ),
      )
      .orderBy(schema.examGrading.sequence_index);
  }

  async findSchoolById(schoolId: string) {
    const [row] = await this.db
      .select()
      .from(schema.schools)
      .where(eq(schema.schools.id, schoolId));
    return row;
  }

  async findSectionById(sectionId: string) {
    const [row] = await this.db
      .select()
      .from(schema.sections)
      .where(eq(schema.sections.id, sectionId));
    return row;
  }
}
