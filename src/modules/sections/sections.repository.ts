import { Injectable, Inject } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { sections } from '../../database/drizzle/schema';
import { classes } from '../../database/drizzle/schema/classes.schema';
import { Section, NewSection } from './types/section.types';

@Injectable()
export class SectionsRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  async findAll(schoolId: string, classId?: string): Promise<Section[]> {
    const conditions = [eq(sections.school_id, schoolId), eq(sections.deleted, false)];

    if (classId) {
      conditions.push(eq(sections.class_id, classId));
    }

    return this.db
      .select()
      .from(sections)
      .where(and(...conditions));
  }

  async findById(id: string, schoolId: string): Promise<Section | undefined> {
    const [row] = await this.db
      .select()
      .from(sections)
      .where(
        and(eq(sections.id, id), eq(sections.school_id, schoolId), eq(sections.deleted, false)),
      );
    return row;
  }

  async findByNameInClass(
    schoolId: string,
    classId: string,
    name: string,
  ): Promise<Section | undefined> {
    const [row] = await this.db
      .select()
      .from(sections)
      .where(
        and(
          eq(sections.school_id, schoolId),
          eq(sections.class_id, classId),
          eq(sections.deleted, false),
          sql`lower(${sections.name}) = lower(${name})`,
        ),
      )
      .limit(1);
    return row;
  }

  async classExists(schoolId: string, classId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: classes.id })
      .from(classes)
      .where(
        and(eq(classes.id, classId), eq(classes.school_id, schoolId), eq(classes.deleted, false)),
      );
    return !!row;
  }

  async create(data: NewSection): Promise<Section> {
    const [row] = await this.db.insert(sections).values(data).returning();
    return row;
  }

  async update(id: string, schoolId: string, data: Partial<NewSection>): Promise<Section> {
    const [row] = await this.db
      .update(sections)
      .set({ ...data, updated_at: new Date() })
      .where(and(eq(sections.id, id), eq(sections.school_id, schoolId)))
      .returning();
    return row;
  }

  async softDelete(id: string, schoolId: string): Promise<void> {
    await this.db
      .update(sections)
      .set({ deleted: true, is_active: false, updated_at: new Date() })
      .where(and(eq(sections.id, id), eq(sections.school_id, schoolId)));
  }
}
