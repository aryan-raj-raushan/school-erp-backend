import { Injectable, Inject } from '@nestjs/common';
import { eq, and, ilike, sql, inArray } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { subjects } from '../../database/drizzle/schema/subjects.schema';
import { subjectClasses } from '../../database/drizzle/schema/subject-classes.schema';
import { Subject, NewSubject } from './types/subject.types';
import { SubjectFilterDto } from './dto/subject-filter.dto';
import { generateId } from '../../utils/uuid.utils';

@Injectable()
export class SubjectsRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  private buildConditions(schoolId: string, filters: Partial<Omit<SubjectFilterDto, 'class_id'>> = {}) {
    const conditions = [
      eq(subjects.school_id, schoolId),
      eq(subjects.deleted, false),
    ];
    if (filters.class_detail_id) conditions.push(eq(subjects.class_detail_id, filters.class_detail_id));
    if (filters.search) conditions.push(ilike(subjects.name, `%${filters.search}%`));
    return conditions;
  }

  private async attachClassIds(rows: Omit<Subject, 'class_ids'>[]): Promise<Subject[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);
    const links = await this.db
      .select({ subject_id: subjectClasses.subject_id, class_id: subjectClasses.class_id })
      .from(subjectClasses)
      .where(inArray(subjectClasses.subject_id, ids));
    return rows.map((row) => ({
      ...row,
      class_ids: links.filter((l) => l.subject_id === row.id).map((l) => l.class_id),
    }));
  }

  private async syncClassIds(subjectId: string, classIds: string[]): Promise<void> {
    await this.db.delete(subjectClasses).where(eq(subjectClasses.subject_id, subjectId));
    if (classIds.length > 0) {
      await this.db.insert(subjectClasses).values(
        classIds.map((classId) => ({ id: generateId(), subject_id: subjectId, class_id: classId })),
      );
    }
  }

  async findAll(schoolId: string, filters: SubjectFilterDto): Promise<Subject[]> {
    const limit = filters.limit ?? 20;
    const offset = ((filters.page ?? 1) - 1) * limit;

    let query = this.db
      .select({ subject: subjects })
      .from(subjects)
      .where(and(...this.buildConditions(schoolId, filters)));

    if (filters.class_id) {
      const rows = await this.db
        .selectDistinct({ subject: subjects })
        .from(subjects)
        .innerJoin(subjectClasses, eq(subjectClasses.subject_id, subjects.id))
        .where(and(...this.buildConditions(schoolId, filters), eq(subjectClasses.class_id, filters.class_id)))
        .orderBy(subjects.display_order, subjects.name)
        .limit(limit)
        .offset(offset);
      return this.attachClassIds(rows.map((r) => r.subject));
    }

    const rows = await this.db
      .select()
      .from(subjects)
      .where(and(...this.buildConditions(schoolId, filters)))
      .orderBy(subjects.display_order, subjects.name)
      .limit(limit)
      .offset(offset);
    return this.attachClassIds(rows);
  }

  async count(schoolId: string, filters: SubjectFilterDto): Promise<number> {
    if (filters.class_id) {
      const [{ count }] = await this.db
        .select({ count: sql<number>`count(distinct ${subjects.id})` })
        .from(subjects)
        .innerJoin(subjectClasses, eq(subjectClasses.subject_id, subjects.id))
        .where(and(...this.buildConditions(schoolId, filters), eq(subjectClasses.class_id, filters.class_id)));
      return Number(count);
    }
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(subjects)
      .where(and(...this.buildConditions(schoolId, filters)));
    return Number(count);
  }

  async findById(id: string, schoolId: string): Promise<Subject | undefined> {
    const [row] = await this.db
      .select()
      .from(subjects)
      .where(and(eq(subjects.id, id), eq(subjects.school_id, schoolId), eq(subjects.deleted, false)));
    if (!row) return undefined;
    const [result] = await this.attachClassIds([row]);
    return result;
  }

  async create(data: NewSubject, classIds: string[] = []): Promise<Subject> {
    const [row] = await this.db.insert(subjects).values(data).returning();
    await this.syncClassIds(row.id, classIds);
    const [result] = await this.attachClassIds([row]);
    return result;
  }

  async update(id: string, schoolId: string, data: Partial<NewSubject>, classIds?: string[]): Promise<Subject> {
    const [row] = await this.db
      .update(subjects)
      .set({ ...data, updated_at: new Date() })
      .where(and(eq(subjects.id, id), eq(subjects.school_id, schoolId)))
      .returning();
    if (classIds !== undefined) await this.syncClassIds(id, classIds);
    const [result] = await this.attachClassIds([row]);
    return result;
  }

  async softDelete(id: string, schoolId: string): Promise<void> {
    await this.db
      .update(subjects)
      .set({ deleted: true, is_active: false, updated_at: new Date() })
      .where(and(eq(subjects.id, id), eq(subjects.school_id, schoolId)));
  }
}
