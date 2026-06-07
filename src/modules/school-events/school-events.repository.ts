import { Injectable, Inject } from '@nestjs/common';
import { eq, and, ilike, sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { schoolEvents } from '../../database/drizzle/schema/school-events.schema';
import { SchoolEvent, NewSchoolEvent } from './types/school-event.types';
import { SchoolEventFilterDto } from './dto/school-event-filter.dto';

@Injectable()
export class SchoolEventsRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  private buildConditions(schoolId: string, filters: SchoolEventFilterDto) {
    const conditions = [
      eq(schoolEvents.school_id, schoolId),
      eq(schoolEvents.deleted, false),
      eq(schoolEvents.is_active, true),
    ];

    if (filters.type) {
      conditions.push(eq(schoolEvents.type, filters.type));
    }
    if (filters.academic_year_id) {
      conditions.push(eq(schoolEvents.academic_year_id, filters.academic_year_id));
    }
    if (filters.search) {
      conditions.push(ilike(schoolEvents.name, `%${filters.search}%`));
    }

    return conditions;
  }

  async findAll(schoolId: string, filters: SchoolEventFilterDto): Promise<SchoolEvent[]> {
    const conditions = this.buildConditions(schoolId, filters);
    const limit = filters.limit ?? 20;
    const offset = ((filters.page ?? 1) - 1) * limit;

    return this.db
      .select()
      .from(schoolEvents)
      .where(and(...conditions))
      .orderBy(schoolEvents.from_date)
      .limit(limit)
      .offset(offset);
  }

  async count(schoolId: string, filters: SchoolEventFilterDto): Promise<number> {
    const conditions = this.buildConditions(schoolId, filters);
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schoolEvents)
      .where(and(...conditions));
    return Number(count);
  }

  async findById(id: string, schoolId: string): Promise<SchoolEvent | undefined> {
    const [row] = await this.db
      .select()
      .from(schoolEvents)
      .where(
        and(
          eq(schoolEvents.id, id),
          eq(schoolEvents.school_id, schoolId),
          eq(schoolEvents.deleted, false),
        ),
      );
    return row;
  }

  async create(data: NewSchoolEvent): Promise<SchoolEvent> {
    const [row] = await this.db.insert(schoolEvents).values(data).returning();
    return row;
  }

  async update(id: string, schoolId: string, data: Partial<NewSchoolEvent>): Promise<SchoolEvent> {
    const [row] = await this.db
      .update(schoolEvents)
      .set({ ...data, updated_at: new Date() })
      .where(and(eq(schoolEvents.id, id), eq(schoolEvents.school_id, schoolId)))
      .returning();
    return row;
  }

  async softDelete(id: string, schoolId: string): Promise<void> {
    await this.db
      .update(schoolEvents)
      .set({ deleted: true, is_active: false, updated_at: new Date() })
      .where(and(eq(schoolEvents.id, id), eq(schoolEvents.school_id, schoolId)));
  }
}