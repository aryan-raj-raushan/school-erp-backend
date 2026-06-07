import { Injectable, Inject } from '@nestjs/common';
import { eq, and, ilike, sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { subjects } from '../../database/drizzle/schema';
import { Subject, NewSubject } from './types/subject.types';
import { SubjectFilterDto } from './dto/subject-filter.dto';

@Injectable()
export class SubjectsRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  private buildConditions(schoolId: string, filters: Partial<SubjectFilterDto> = {}) {
    const conditions = [
      eq(subjects.school_id, schoolId),
      eq(subjects.deleted, false),
    ];
    if (filters.class_id) conditions.push(eq(subjects.class_id, filters.class_id));
    if (filters.timetable_session_id) conditions.push(eq(subjects.timetable_session_id, filters.timetable_session_id));
    if (filters.class_detail_id) conditions.push(eq(subjects.class_detail_id, filters.class_detail_id));
    if (filters.search) conditions.push(ilike(subjects.name, `%${filters.search}%`));
    return conditions;
  }

  async findAll(schoolId: string, filters: SubjectFilterDto): Promise<Subject[]> {
    const limit = filters.limit ?? 20;
    const offset = ((filters.page ?? 1) - 1) * limit;
    return this.db
      .select()
      .from(subjects)
      .where(and(...this.buildConditions(schoolId, filters)))
      .orderBy(subjects.display_order, subjects.name)
      .limit(limit)
      .offset(offset);
  }

  async count(schoolId: string, filters: SubjectFilterDto): Promise<number> {
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
    return row;
  }

  async create(data: NewSubject): Promise<Subject> {
    const [row] = await this.db.insert(subjects).values(data).returning();
    return row;
  }

  async update(id: string, schoolId: string, data: Partial<NewSubject>): Promise<Subject> {
    const [row] = await this.db
      .update(subjects)
      .set({ ...data, updated_at: new Date() })
      .where(and(eq(subjects.id, id), eq(subjects.school_id, schoolId)))
      .returning();
    return row;
  }

  async softDelete(id: string, schoolId: string): Promise<void> {
    await this.db
      .update(subjects)
      .set({ deleted: true, is_active: false, updated_at: new Date() })
      .where(and(eq(subjects.id, id), eq(subjects.school_id, schoolId)));
  }
}
