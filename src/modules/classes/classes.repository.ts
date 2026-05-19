import { Injectable, Inject } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { classes } from '../../database/drizzle/schema';
import { Class, NewClass } from './types/class.types';
import { ClassFilterDto } from './dto/class-filter.dto';

@Injectable()
export class ClassesRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  async findAll(schoolId: string, filters: ClassFilterDto): Promise<Class[]> {
    const conditions = [
      eq(classes.school_id, schoolId),
      eq(classes.deleted, false),
    ];

    if (filters.academic_year_id) {
      conditions.push(eq(classes.academic_year_id, filters.academic_year_id));
    }

    const limit = filters.limit ?? 20;
    const offset = ((filters.page ?? 1) - 1) * limit;

    return this.db
      .select()
      .from(classes)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset);
  }

  async count(schoolId: string, filters: ClassFilterDto): Promise<number> {
    const conditions = [
      eq(classes.school_id, schoolId),
      eq(classes.deleted, false),
    ];

    if (filters.academic_year_id) {
      conditions.push(eq(classes.academic_year_id, filters.academic_year_id));
    }

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(classes)
      .where(and(...conditions));
    return Number(count);
  }

  async findById(id: string, schoolId: string): Promise<Class | undefined> {
    const [row] = await this.db
      .select()
      .from(classes)
      .where(
        and(
          eq(classes.id, id),
          eq(classes.school_id, schoolId),
          eq(classes.deleted, false),
        ),
      );
    return row;
  }

  async create(data: NewClass): Promise<Class> {
    const [row] = await this.db.insert(classes).values(data).returning();
    return row;
  }

  async update(id: string, schoolId: string, data: Partial<NewClass>): Promise<Class> {
    const [row] = await this.db
      .update(classes)
      .set({ ...data, updated_at: new Date() })
      .where(
        and(
          eq(classes.id, id),
          eq(classes.school_id, schoolId),
        ),
      )
      .returning();
    return row;
  }

  async softDelete(id: string, schoolId: string): Promise<void> {
    await this.db
      .update(classes)
      .set({ deleted: true, is_active: false, updated_at: new Date() })
      .where(
        and(
          eq(classes.id, id),
          eq(classes.school_id, schoolId),
        ),
      );
  }
}
