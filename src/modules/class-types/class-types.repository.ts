import { Injectable, Inject } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { classTypes } from '../../database/drizzle/schema/class-types.schema';
import { ClassType, NewClassType } from './types/class-type.types';
import { FilterClassTypeDto } from './dto/filter-class-type.dto';

@Injectable()
export class ClassTypesRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  private buildConditions(schoolId: string, filters: Partial<FilterClassTypeDto> = {}) {
    const conditions = [eq(classTypes.school_id, schoolId), eq(classTypes.deleted, false)];
    if (filters.is_active !== undefined) conditions.push(eq(classTypes.is_active, filters.is_active));
    return conditions;
  }

  async findAll(schoolId: string, filters: FilterClassTypeDto): Promise<ClassType[]> {
    const limit = filters.limit ?? 20;
    const offset = ((filters.page ?? 1) - 1) * limit;
    return this.db
      .select()
      .from(classTypes)
      .where(and(...this.buildConditions(schoolId, filters)))
      .orderBy(classTypes.name)
      .limit(limit)
      .offset(offset);
  }

  async count(schoolId: string, filters: FilterClassTypeDto): Promise<number> {
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(classTypes)
      .where(and(...this.buildConditions(schoolId, filters)));
    return Number(count);
  }

  async findById(id: string, schoolId: string): Promise<ClassType | undefined> {
    const [row] = await this.db
      .select()
      .from(classTypes)
      .where(and(eq(classTypes.id, id), eq(classTypes.school_id, schoolId), eq(classTypes.deleted, false)));
    return row;
  }

  async create(data: NewClassType): Promise<ClassType> {
    const [row] = await this.db.insert(classTypes).values(data).returning();
    return row;
  }

  async update(id: string, schoolId: string, data: Partial<NewClassType>): Promise<ClassType | undefined> {
    const [row] = await this.db
      .update(classTypes)
      .set({ ...data, updated_at: new Date() })
      .where(and(eq(classTypes.id, id), eq(classTypes.school_id, schoolId)))
      .returning();
    return row;
  }

  async softDelete(id: string, schoolId: string): Promise<void> {
    await this.db
      .update(classTypes)
      .set({ deleted: true, is_active: false, updated_at: new Date() })
      .where(and(eq(classTypes.id, id), eq(classTypes.school_id, schoolId)));
  }
}
