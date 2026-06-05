import { Injectable, Inject } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { classSectionSubjects } from '../../database/drizzle/schema/class-section-subjects.schema';
import { masterSubjects } from '../../database/drizzle/schema/master-subjects.schema';
import { ClassSectionSubject, NewClassSectionSubject } from './types/class-subject.types';
import { ClassSubjectFilterDto } from './dto/class-subject-filter.dto';

@Injectable()
export class ClassSubjectsRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  async findAll(schoolId: string, filters: ClassSubjectFilterDto) {
    const conditions = [
      eq(classSectionSubjects.school_id, schoolId),
      eq(classSectionSubjects.deleted, false),
    ];

    if (filters.class_section_id) conditions.push(eq(classSectionSubjects.class_section_id, filters.class_section_id));
    if (filters.academic_year_id) conditions.push(eq(classSectionSubjects.academic_year_id, filters.academic_year_id));

    const limit = filters.limit ?? 50;
    const offset = ((filters.page ?? 1) - 1) * limit;

    return this.db
      .select({
        id: classSectionSubjects.id,
        class_section_id: classSectionSubjects.class_section_id,
        subject_id: classSectionSubjects.subject_id,
        subject_name: masterSubjects.name,
        subject_code: masterSubjects.code,
        academic_year_id: classSectionSubjects.academic_year_id,
        is_teaching_subject: classSectionSubjects.is_teaching_subject,
        created_at: classSectionSubjects.created_at,
      })
      .from(classSectionSubjects)
      .innerJoin(masterSubjects, eq(classSectionSubjects.subject_id, masterSubjects.id))
      .where(and(...conditions))
      .orderBy(masterSubjects.name)
      .limit(limit)
      .offset(offset);
  }

  async count(schoolId: string, filters: ClassSubjectFilterDto): Promise<number> {
    const conditions = [
      eq(classSectionSubjects.school_id, schoolId),
      eq(classSectionSubjects.deleted, false),
    ];

    if (filters.class_section_id) conditions.push(eq(classSectionSubjects.class_section_id, filters.class_section_id));
    if (filters.academic_year_id) conditions.push(eq(classSectionSubjects.academic_year_id, filters.academic_year_id));

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(classSectionSubjects)
      .where(and(...conditions));
    return Number(count);
  }

  async findById(id: string, schoolId: string): Promise<ClassSectionSubject | undefined> {
    const [row] = await this.db
      .select()
      .from(classSectionSubjects)
      .where(and(eq(classSectionSubjects.id, id), eq(classSectionSubjects.school_id, schoolId), eq(classSectionSubjects.deleted, false)));
    return row;
  }

  async create(data: NewClassSectionSubject): Promise<ClassSectionSubject> {
    const [row] = await this.db.insert(classSectionSubjects).values(data).returning();
    return row;
  }

  async update(id: string, schoolId: string, data: Partial<NewClassSectionSubject>): Promise<ClassSectionSubject> {
    const [row] = await this.db
      .update(classSectionSubjects)
      .set({ ...data, updated_at: new Date() })
      .where(and(eq(classSectionSubjects.id, id), eq(classSectionSubjects.school_id, schoolId)))
      .returning();
    return row;
  }

  async softDelete(id: string, schoolId: string): Promise<void> {
    await this.db
      .update(classSectionSubjects)
      .set({ deleted: true, updated_at: new Date() })
      .where(and(eq(classSectionSubjects.id, id), eq(classSectionSubjects.school_id, schoolId)));
  }
}
