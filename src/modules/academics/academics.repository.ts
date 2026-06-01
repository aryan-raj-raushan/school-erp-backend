import { Injectable, Inject } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { homeworks, homeworkSubmissions, studyMaterials } from '../../database/drizzle/schema/academics.schema';
import { Homework, NewHomework, HomeworkSubmission, NewHomeworkSubmission, StudyMaterial, NewStudyMaterial } from './types/academic.types';

@Injectable()
export class AcademicsRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  // Homework
  async findAllHomework(schoolId: string, filters: { class_section_id?: string; subject_id?: string; academic_year_id?: string }): Promise<Homework[]> {
    const conditions = [eq(homeworks.school_id, schoolId), eq(homeworks.deleted, false)];
    if (filters.class_section_id) conditions.push(eq(homeworks.class_section_id, filters.class_section_id));
    if (filters.subject_id) conditions.push(eq(homeworks.subject_id, filters.subject_id));
    if (filters.academic_year_id) conditions.push(eq(homeworks.academic_year_id, filters.academic_year_id));
    return this.db.select().from(homeworks).where(and(...conditions)).orderBy(homeworks.due_date);
  }

  async findHomeworkById(id: string, schoolId: string): Promise<Homework | undefined> {
    const [row] = await this.db.select().from(homeworks).where(and(eq(homeworks.id, id), eq(homeworks.school_id, schoolId), eq(homeworks.deleted, false)));
    return row;
  }

  async createHomework(data: NewHomework): Promise<Homework> {
    const [row] = await this.db.insert(homeworks).values(data).returning();
    return row;
  }

  async updateHomework(id: string, schoolId: string, data: Partial<NewHomework>): Promise<Homework> {
    const [row] = await this.db.update(homeworks).set({ ...data, updated_at: new Date() }).where(and(eq(homeworks.id, id), eq(homeworks.school_id, schoolId))).returning();
    return row;
  }

  async softDeleteHomework(id: string, schoolId: string): Promise<void> {
    await this.db.update(homeworks).set({ deleted: true, updated_at: new Date() }).where(and(eq(homeworks.id, id), eq(homeworks.school_id, schoolId)));
  }

  // Homework Submissions
  async findSubmissionsByHomework(homeworkId: string, schoolId: string): Promise<HomeworkSubmission[]> {
    return this.db.select().from(homeworkSubmissions).where(and(eq(homeworkSubmissions.homework_id, homeworkId), eq(homeworkSubmissions.school_id, schoolId)));
  }

  async findSubmissionByStudent(homeworkId: string, studentId: string, schoolId: string): Promise<HomeworkSubmission | undefined> {
    const [row] = await this.db.select().from(homeworkSubmissions).where(and(eq(homeworkSubmissions.homework_id, homeworkId), eq(homeworkSubmissions.student_id, studentId), eq(homeworkSubmissions.school_id, schoolId)));
    return row;
  }

  async upsertSubmission(data: NewHomeworkSubmission): Promise<HomeworkSubmission> {
    const [row] = await this.db.insert(homeworkSubmissions).values(data)
      .onConflictDoUpdate({ target: [homeworkSubmissions.homework_id, homeworkSubmissions.student_id], set: { status: data.status, remarks: data.remarks, updated_at: new Date() } })
      .returning();
    return row;
  }

  async updateSubmission(homeworkId: string, studentId: string, schoolId: string, data: Partial<NewHomeworkSubmission>): Promise<HomeworkSubmission> {
    const [row] = await this.db.update(homeworkSubmissions).set({ ...data, updated_at: new Date() }).where(and(eq(homeworkSubmissions.homework_id, homeworkId), eq(homeworkSubmissions.student_id, studentId), eq(homeworkSubmissions.school_id, schoolId))).returning();
    return row;
  }

  // Study Materials
  async findAllMaterials(schoolId: string, filters: { class_section_id?: string; subject_id?: string; academic_year_id?: string }): Promise<StudyMaterial[]> {
    const conditions = [eq(studyMaterials.school_id, schoolId), eq(studyMaterials.deleted, false)];
    if (filters.class_section_id) conditions.push(eq(studyMaterials.class_section_id, filters.class_section_id));
    if (filters.subject_id) conditions.push(eq(studyMaterials.subject_id, filters.subject_id));
    if (filters.academic_year_id) conditions.push(eq(studyMaterials.academic_year_id, filters.academic_year_id));
    return this.db.select().from(studyMaterials).where(and(...conditions)).orderBy(studyMaterials.created_at);
  }

  async findMaterialById(id: string, schoolId: string): Promise<StudyMaterial | undefined> {
    const [row] = await this.db.select().from(studyMaterials).where(and(eq(studyMaterials.id, id), eq(studyMaterials.school_id, schoolId), eq(studyMaterials.deleted, false)));
    return row;
  }

  async createMaterial(data: NewStudyMaterial): Promise<StudyMaterial> {
    const [row] = await this.db.insert(studyMaterials).values(data).returning();
    return row;
  }

  async updateMaterial(id: string, schoolId: string, data: Partial<NewStudyMaterial>): Promise<StudyMaterial> {
    const [row] = await this.db.update(studyMaterials).set({ ...data, updated_at: new Date() }).where(and(eq(studyMaterials.id, id), eq(studyMaterials.school_id, schoolId))).returning();
    return row;
  }

  async softDeleteMaterial(id: string, schoolId: string): Promise<void> {
    await this.db.update(studyMaterials).set({ deleted: true, updated_at: new Date() }).where(and(eq(studyMaterials.id, id), eq(studyMaterials.school_id, schoolId)));
  }
}
