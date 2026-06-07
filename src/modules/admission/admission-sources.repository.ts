import { Injectable, Inject } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { admissionSources } from '../../database/drizzle/schema/admission-sources.schema';
import { AdmissionSource, NewAdmissionSource } from './types/admission-source.types';
import { FilterAdmissionSourceDto } from './dto/filter-admission-source.dto';

@Injectable()
export class AdmissionSourcesRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  private buildConditions(schoolId: string, filters: FilterAdmissionSourceDto) {
    const conditions = [
      eq(admissionSources.school_id, schoolId),
      eq(admissionSources.deleted, false),
    ];
    if (filters.is_enabled !== undefined) {
      conditions.push(eq(admissionSources.is_enabled, filters.is_enabled));
    }
    return conditions;
  }

  async findAll(schoolId: string, filters: FilterAdmissionSourceDto): Promise<AdmissionSource[]> {
    const conditions = this.buildConditions(schoolId, filters);
    const limit = filters.limit ?? 20;
    const offset = ((filters.page ?? 1) - 1) * limit;
    return this.db
      .select()
      .from(admissionSources)
      .where(and(...conditions))
      .orderBy(admissionSources.created_at)
      .limit(limit)
      .offset(offset);
  }

  async count(schoolId: string, filters: FilterAdmissionSourceDto): Promise<number> {
    const conditions = this.buildConditions(schoolId, filters);
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(admissionSources)
      .where(and(...conditions));
    return Number(count);
  }

  async findById(id: string, schoolId: string): Promise<AdmissionSource | undefined> {
    const [row] = await this.db
      .select()
      .from(admissionSources)
      .where(and(
        eq(admissionSources.id, id),
        eq(admissionSources.school_id, schoolId),
        eq(admissionSources.deleted, false),
      ));
    return row;
  }

  async create(data: NewAdmissionSource): Promise<AdmissionSource> {
    const [row] = await this.db.insert(admissionSources).values(data).returning();
    return row;
  }

  async update(id: string, schoolId: string, data: Partial<NewAdmissionSource>): Promise<AdmissionSource> {
    const [row] = await this.db
      .update(admissionSources)
      .set({ ...data, updated_at: new Date() })
      .where(and(eq(admissionSources.id, id), eq(admissionSources.school_id, schoolId)))
      .returning();
    return row;
  }

  async softDelete(id: string, schoolId: string): Promise<void> {
    await this.db
      .update(admissionSources)
      .set({ deleted: true, updated_at: new Date() })
      .where(and(eq(admissionSources.id, id), eq(admissionSources.school_id, schoolId)));
  }
}