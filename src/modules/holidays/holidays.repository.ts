import { Injectable, Inject } from '@nestjs/common';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { holidays } from '../../database/drizzle/schema';
import { Holiday, NewHoliday } from './types/holiday.types';
import { HolidayType } from '../../shared/enums';

interface HolidayFilters {
  academic_year_id?: string;
  from_date?: string;
  to_date?: string;
  type?: HolidayType;
}

@Injectable()
export class HolidaysRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  private baseConditions(schoolId: string) {
    return and(eq(holidays.school_id, schoolId), eq(holidays.deleted, false));
  }

  async findAll(schoolId: string, filters: HolidayFilters, page: number, limit: number): Promise<Holiday[]> {
    const offset = (page - 1) * limit;
    const conditions = [
      eq(holidays.school_id, schoolId),
      eq(holidays.deleted, false),
    ];

    if (filters.academic_year_id) conditions.push(eq(holidays.academic_year_id, filters.academic_year_id));
    if (filters.type) conditions.push(eq(holidays.type, filters.type));
    if (filters.from_date) conditions.push(gte(holidays.date, filters.from_date));
    if (filters.to_date) conditions.push(lte(holidays.date, filters.to_date));

    return this.db
      .select()
      .from(holidays)
      .where(and(...conditions))
      .orderBy(holidays.date)
      .limit(limit)
      .offset(offset);
  }

  async count(schoolId: string, filters: HolidayFilters): Promise<number> {
    const conditions = [
      eq(holidays.school_id, schoolId),
      eq(holidays.deleted, false),
    ];

    if (filters.academic_year_id) conditions.push(eq(holidays.academic_year_id, filters.academic_year_id));
    if (filters.type) conditions.push(eq(holidays.type, filters.type));
    if (filters.from_date) conditions.push(gte(holidays.date, filters.from_date));
    if (filters.to_date) conditions.push(lte(holidays.date, filters.to_date));

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(holidays)
      .where(and(...conditions));

    return Number(count);
  }

  async findById(id: string, schoolId: string): Promise<Holiday | undefined> {
    const [row] = await this.db
      .select()
      .from(holidays)
      .where(and(eq(holidays.id, id), this.baseConditions(schoolId)));
    return row;
  }

  async create(data: NewHoliday): Promise<Holiday> {
    const [row] = await this.db.insert(holidays).values(data).returning();
    return row;
  }

  async update(id: string, schoolId: string, data: Partial<NewHoliday>): Promise<Holiday> {
    const [row] = await this.db
      .update(holidays)
      .set({ ...data, updated_at: new Date() })
      .where(and(eq(holidays.id, id), eq(holidays.school_id, schoolId)))
      .returning();
    return row;
  }

  async softDelete(id: string, schoolId: string): Promise<void> {
    await this.db
      .update(holidays)
      .set({ deleted: true, is_active: false, updated_at: new Date() })
      .where(and(eq(holidays.id, id), eq(holidays.school_id, schoolId)));
  }
}
