import { Injectable, Inject } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { academicYears } from '../../database/drizzle/schema';
import { AcademicYear, NewAcademicYear } from './types/academic-year.types';

@Injectable()
export class AcademicYearsRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  async findAll(schoolId: string, page: number, limit: number): Promise<AcademicYear[]> {
    const offset = (page - 1) * limit;
    return this.db
      .select()
      .from(academicYears)
      .where(
        and(
          eq(academicYears.school_id, schoolId),
          eq(academicYears.is_active, true),
        ),
      )
      .limit(limit)
      .offset(offset);
  }

  async count(schoolId: string): Promise<number> {
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(academicYears)
      .where(
        and(
          eq(academicYears.school_id, schoolId),
          eq(academicYears.is_active, true),
        ),
      );
    return Number(count);
  }

  async findById(id: string, schoolId: string): Promise<AcademicYear | undefined> {
    const [row] = await this.db
      .select()
      .from(academicYears)
      .where(
        and(
          eq(academicYears.id, id),
          eq(academicYears.school_id, schoolId),
          eq(academicYears.is_active, true),
        ),
      );
    return row;
  }

  async findCurrent(schoolId: string): Promise<AcademicYear | undefined> {
    const [row] = await this.db
      .select()
      .from(academicYears)
      .where(
        and(
          eq(academicYears.school_id, schoolId),
          eq(academicYears.is_current, true),
          eq(academicYears.is_active, true),
        ),
      );
    return row;
  }

  async create(data: NewAcademicYear): Promise<AcademicYear> {
    const [row] = await this.db.insert(academicYears).values(data).returning();
    return row;
  }

  async update(
    id: string,
    schoolId: string,
    data: Partial<NewAcademicYear>,
  ): Promise<AcademicYear> {
    const [row] = await this.db
      .update(academicYears)
      .set({ ...data, updated_at: new Date() })
      .where(
        and(
          eq(academicYears.id, id),
          eq(academicYears.school_id, schoolId),
        ),
      )
      .returning();
    return row;
  }

  async setCurrent(id: string, schoolId: string): Promise<AcademicYear> {
    await this.db
      .update(academicYears)
      .set({ is_current: false, updated_at: new Date() })
      .where(eq(academicYears.school_id, schoolId));

    const [row] = await this.db
      .update(academicYears)
      .set({ is_current: true, updated_at: new Date() })
      .where(
        and(
          eq(academicYears.id, id),
          eq(academicYears.school_id, schoolId),
        ),
      )
      .returning();
    return row;
  }
}
