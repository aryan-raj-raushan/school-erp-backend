import { Injectable, Inject } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { timetableSessions } from '../../database/drizzle/schema';
import { TimetableSession, NewTimetableSession } from './types/timetable-session.types';
import { TimetableSessionType } from '../../shared/enums';

interface TimetableSessionFilters {
  academic_year_id?: string;
  timetable_session?: TimetableSessionType;
  is_enabled?: boolean;
  is_active_session?: boolean;
}

@Injectable()
export class TimetableSessionsRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  private baseConditions(schoolId: string) {
    return and(eq(timetableSessions.school_id, schoolId), eq(timetableSessions.deleted, false));
  }

  private applyFilters(schoolId: string, filters: TimetableSessionFilters) {
    const conditions = [
      eq(timetableSessions.school_id, schoolId),
      eq(timetableSessions.deleted, false),
    ];
    if (filters.academic_year_id) conditions.push(eq(timetableSessions.academic_year_id, filters.academic_year_id));
    if (filters.timetable_session) conditions.push(eq(timetableSessions.timetable_session, filters.timetable_session));
    if (filters.is_enabled !== undefined) conditions.push(eq(timetableSessions.is_enabled, filters.is_enabled));
    if (filters.is_active_session !== undefined) conditions.push(eq(timetableSessions.is_active_session, filters.is_active_session));
    return conditions;
  }

  async findAll(
    schoolId: string,
    filters: TimetableSessionFilters,
    page: number,
    limit: number,
  ): Promise<TimetableSession[]> {
    const offset = (page - 1) * limit;
    return this.db
      .select()
      .from(timetableSessions)
      .where(and(...this.applyFilters(schoolId, filters)))
      .orderBy(timetableSessions.start_date)
      .limit(limit)
      .offset(offset);
  }

  async count(schoolId: string, filters: TimetableSessionFilters): Promise<number> {
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(timetableSessions)
      .where(and(...this.applyFilters(schoolId, filters)));
    return Number(count);
  }

  async findById(id: string, schoolId: string): Promise<TimetableSession | undefined> {
    const [row] = await this.db
      .select()
      .from(timetableSessions)
      .where(and(eq(timetableSessions.id, id), this.baseConditions(schoolId)));
    return row;
  }

  async findActiveSession(schoolId: string): Promise<TimetableSession | undefined> {
    const [row] = await this.db
      .select()
      .from(timetableSessions)
      .where(
        and(
          eq(timetableSessions.school_id, schoolId),
          eq(timetableSessions.is_active_session, true),
          eq(timetableSessions.deleted, false),
        ),
      );
    return row;
  }

  async create(data: NewTimetableSession): Promise<TimetableSession> {
    const [row] = await this.db.insert(timetableSessions).values(data).returning();
    return row;
  }

  async update(id: string, schoolId: string, data: Partial<NewTimetableSession>): Promise<TimetableSession> {
    const [row] = await this.db
      .update(timetableSessions)
      .set({ ...data, updated_at: new Date() })
      .where(and(eq(timetableSessions.id, id), eq(timetableSessions.school_id, schoolId)))
      .returning();
    return row;
  }

  async clearActiveSession(schoolId: string): Promise<void> {
    await this.db
      .update(timetableSessions)
      .set({ is_active_session: false, updated_at: new Date() })
      .where(
        and(
          eq(timetableSessions.school_id, schoolId),
          eq(timetableSessions.is_active_session, true),
        ),
      );
  }

  async softDelete(id: string, schoolId: string): Promise<void> {
    await this.db
      .update(timetableSessions)
      .set({ deleted: true, is_enabled: false, updated_at: new Date() })
      .where(and(eq(timetableSessions.id, id), eq(timetableSessions.school_id, schoolId)));
  }
}
