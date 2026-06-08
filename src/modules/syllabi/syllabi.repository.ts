import { Injectable, Inject } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { syllabi, syllabusAttachments } from '../../database/drizzle/schema';
import {
  Syllabus,
  NewSyllabus,
  SyllabusAttachment,
  NewSyllabusAttachment,
  SyllabusWithAttachments,
} from './types/syllabus.types';
import { FilterSyllabusDto } from './dto/filter-syllabus.dto';

@Injectable()
export class SyllabiRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  private buildConditions(schoolId: string, filters: Partial<FilterSyllabusDto> = {}) {
    const conditions = [
      eq(syllabi.school_id, schoolId),
      eq(syllabi.deleted, false),
    ];
    if (filters.class_id) conditions.push(eq(syllabi.class_id, filters.class_id));
    if (filters.class_detail_id) conditions.push(eq(syllabi.class_detail_id, filters.class_detail_id));
    return conditions;
  }

  async findAll(schoolId: string, filters: FilterSyllabusDto): Promise<Syllabus[]> {
    const limit = filters.limit ?? 20;
    const offset = ((filters.page ?? 1) - 1) * limit;
    return this.db
      .select()
      .from(syllabi)
      .where(and(...this.buildConditions(schoolId, filters)))
      .orderBy(syllabi.created_at)
      .limit(limit)
      .offset(offset);
  }

  async count(schoolId: string, filters: FilterSyllabusDto): Promise<number> {
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(syllabi)
      .where(and(...this.buildConditions(schoolId, filters)));
    return Number(count);
  }

  async findById(id: string, schoolId: string): Promise<Syllabus | undefined> {
    const [row] = await this.db
      .select()
      .from(syllabi)
      .where(and(eq(syllabi.id, id), eq(syllabi.school_id, schoolId), eq(syllabi.deleted, false)));
    return row;
  }

  async findWithAttachments(id: string, schoolId: string): Promise<SyllabusWithAttachments | undefined> {
    const syllabus = await this.findById(id, schoolId);
    if (!syllabus) return undefined;
    const attachments = await this.findAttachments(id);
    return { ...syllabus, attachments };
  }

  async findAttachments(syllabusId: string): Promise<SyllabusAttachment[]> {
    return this.db
      .select()
      .from(syllabusAttachments)
      .where(eq(syllabusAttachments.syllabus_id, syllabusId));
  }

  async create(data: NewSyllabus): Promise<Syllabus> {
    const [row] = await this.db.insert(syllabi).values(data).returning();
    return row;
  }

  async createAttachments(data: NewSyllabusAttachment[]): Promise<SyllabusAttachment[]> {
    if (!data.length) return [];
    return this.db.insert(syllabusAttachments).values(data).returning();
  }

  async deleteAttachmentsBySyllabusId(syllabusId: string): Promise<void> {
    await this.db.delete(syllabusAttachments).where(eq(syllabusAttachments.syllabus_id, syllabusId));
  }

  async deleteAttachmentById(id: string): Promise<void> {
    await this.db.delete(syllabusAttachments).where(eq(syllabusAttachments.id, id));
  }

  async update(id: string, schoolId: string, data: Partial<NewSyllabus>): Promise<Syllabus> {
    const [row] = await this.db
      .update(syllabi)
      .set({ ...data, updated_at: new Date() })
      .where(and(eq(syllabi.id, id), eq(syllabi.school_id, schoolId)))
      .returning();
    return row;
  }

  async softDelete(id: string, schoolId: string): Promise<void> {
    await this.db
      .update(syllabi)
      .set({ deleted: true, is_enabled: false, updated_at: new Date() })
      .where(and(eq(syllabi.id, id), eq(syllabi.school_id, schoolId)));
  }
}
