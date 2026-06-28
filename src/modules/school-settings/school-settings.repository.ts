import { Injectable, Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import {
  schoolSettings,
  schoolTimings,
  classTimingOverrides,
} from '../../database/drizzle/schema/school-settings.schema';
import {
  SchoolSettings,
  SchoolTiming,
  ClassTimingOverride,
} from './types/school-settings.types';

@Injectable()
export class SchoolSettingsRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  // ─── School Settings ─────────────────────────────────────────────────────────

  async findSettings(schoolId: string): Promise<SchoolSettings | undefined> {
    const [row] = await this.db
      .select()
      .from(schoolSettings)
      .where(eq(schoolSettings.school_id, schoolId));
    return row;
  }

  async upsertSettings(
    schoolId: string,
    id: string,
    data: Partial<Omit<SchoolSettings, 'id' | 'school_id' | 'created_at'>>,
  ): Promise<SchoolSettings> {
    const [row] = await this.db
      .insert(schoolSettings)
      .values({ id, school_id: schoolId, ...data })
      .onConflictDoUpdate({
        target: schoolSettings.school_id,
        set: { ...data, updated_at: new Date() },
      })
      .returning();
    return row;
  }

  // ─── School Timings ───────────────────────────────────────────────────────────

  async findTimings(schoolId: string): Promise<SchoolTiming[]> {
    return this.db
      .select()
      .from(schoolTimings)
      .where(and(eq(schoolTimings.school_id, schoolId), eq(schoolTimings.deleted, false)))
      .orderBy(schoolTimings.priority, schoolTimings.effective_from);
  }

  async findTimingById(id: string, schoolId: string): Promise<SchoolTiming | undefined> {
    const [row] = await this.db
      .select()
      .from(schoolTimings)
      .where(
        and(
          eq(schoolTimings.id, id),
          eq(schoolTimings.school_id, schoolId),
          eq(schoolTimings.deleted, false),
        ),
      );
    return row;
  }

  async findActiveTimingForDate(schoolId: string, date: string): Promise<SchoolTiming | undefined> {
    const rows = await this.db
      .select()
      .from(schoolTimings)
      .where(
        and(
          eq(schoolTimings.school_id, schoolId),
          eq(schoolTimings.is_active, true),
          eq(schoolTimings.deleted, false),
        ),
      )
      .orderBy(schoolTimings.priority);

    return rows.find((t) => t.effective_from <= date && t.effective_to >= date);
  }

  async createTiming(data: Omit<SchoolTiming, 'created_at' | 'updated_at'>): Promise<SchoolTiming> {
    const [row] = await this.db.insert(schoolTimings).values(data).returning();
    return row;
  }

  async updateTiming(
    id: string,
    schoolId: string,
    data: Partial<Omit<SchoolTiming, 'id' | 'school_id' | 'created_at'>>,
  ): Promise<SchoolTiming> {
    const [row] = await this.db
      .update(schoolTimings)
      .set({ ...data, updated_at: new Date() })
      .where(and(eq(schoolTimings.id, id), eq(schoolTimings.school_id, schoolId)))
      .returning();
    return row;
  }

  async softDeleteTiming(id: string, schoolId: string): Promise<void> {
    await this.db
      .update(schoolTimings)
      .set({ deleted: true, updated_at: new Date() })
      .where(and(eq(schoolTimings.id, id), eq(schoolTimings.school_id, schoolId)));
  }

  // ─── Class Timing Overrides ───────────────────────────────────────────────────

  async findClassOverrides(schoolId: string): Promise<ClassTimingOverride[]> {
    return this.db
      .select()
      .from(classTimingOverrides)
      .where(eq(classTimingOverrides.school_id, schoolId));
  }

  async findClassOverride(
    classId: string,
    schoolId: string,
  ): Promise<ClassTimingOverride | undefined> {
    const [row] = await this.db
      .select()
      .from(classTimingOverrides)
      .where(
        and(
          eq(classTimingOverrides.class_id, classId),
          eq(classTimingOverrides.school_id, schoolId),
        ),
      );
    return row;
  }

  async upsertClassOverride(
    id: string,
    classId: string,
    schoolId: string,
    timingId: string | null,
  ): Promise<ClassTimingOverride> {
    const [row] = await this.db
      .insert(classTimingOverrides)
      .values({ id, class_id: classId, school_id: schoolId, timing_id: timingId })
      .onConflictDoUpdate({
        target: [classTimingOverrides.class_id, classTimingOverrides.school_id],
        set: { timing_id: timingId },
      })
      .returning();
    return row;
  }
}
