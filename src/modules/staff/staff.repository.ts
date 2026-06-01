import { Injectable, Inject } from '@nestjs/common';
import { eq, and, or, like, sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { schoolUsers } from '../../database/drizzle/schema';
import { StaffMember } from './types/staff.types';
import { FilterStaffDto } from './dto/filter-staff.dto';
import { SchoolRole } from '../../shared/enums';

type NewStaffMember = typeof schoolUsers.$inferInsert;

@Injectable()
export class StaffRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  private buildConditions(schoolId: string, filters: Partial<FilterStaffDto> = {}) {
    const conditions: ReturnType<typeof eq>[] = [
      eq(schoolUsers.school_id, schoolId),
      eq(schoolUsers.deleted, false),
    ];

    if (filters.role) conditions.push(eq(schoolUsers.role, filters.role));
    if (filters.is_active !== undefined) conditions.push(eq(schoolUsers.is_active, filters.is_active));

    return conditions;
  }

  async findAll(schoolId: string, filters: FilterStaffDto): Promise<StaffMember[]> {
    const { page = 1, limit = 20, search } = filters;
    const offset = (page - 1) * limit;
    const conditions = this.buildConditions(schoolId, filters);

    let query = this.db
      .select()
      .from(schoolUsers)
      .where(and(...conditions))
      .orderBy(schoolUsers.created_at)
      .limit(limit)
      .offset(offset) as any;

    if (search) {
      query = this.db
        .select()
        .from(schoolUsers)
        .where(
          and(
            ...conditions,
            or(
              like(schoolUsers.first_name, `%${search}%`),
              like(schoolUsers.last_name, `%${search}%`),
              like(schoolUsers.phone_number, `%${search}%`),
            ),
          ),
        )
        .orderBy(schoolUsers.created_at)
        .limit(limit)
        .offset(offset);
    }

    return query;
  }

  async count(schoolId: string, filters: FilterStaffDto): Promise<number> {
    const conditions = this.buildConditions(schoolId, filters);
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schoolUsers)
      .where(and(...conditions));
    return Number(count);
  }

  async findById(id: string, schoolId: string): Promise<StaffMember | undefined> {
    const [row] = await this.db
      .select()
      .from(schoolUsers)
      .where(and(eq(schoolUsers.id, id), eq(schoolUsers.school_id, schoolId), eq(schoolUsers.deleted, false)));
    return row;
  }

  async findByPhone(phone: string, dialCode: string, schoolId: string): Promise<StaffMember | undefined> {
    const [row] = await this.db
      .select()
      .from(schoolUsers)
      .where(
        and(
          eq(schoolUsers.phone_number, phone),
          eq(schoolUsers.dial_code, dialCode),
          eq(schoolUsers.school_id, schoolId),
          eq(schoolUsers.deleted, false),
        ),
      );
    return row;
  }

  async create(data: NewStaffMember): Promise<StaffMember> {
    const [row] = await this.db.insert(schoolUsers).values(data).returning();
    return row;
  }

  async update(id: string, schoolId: string, data: Partial<NewStaffMember>): Promise<StaffMember> {
    const [row] = await this.db
      .update(schoolUsers)
      .set({ ...data, updated_at: new Date() })
      .where(and(eq(schoolUsers.id, id), eq(schoolUsers.school_id, schoolId)))
      .returning();
    return row;
  }

  async softDelete(id: string, schoolId: string): Promise<void> {
    await this.db
      .update(schoolUsers)
      .set({ deleted: true, is_active: false, updated_at: new Date() })
      .where(and(eq(schoolUsers.id, id), eq(schoolUsers.school_id, schoolId)));
  }

  async setActiveStatus(id: string, schoolId: string, is_active: boolean): Promise<StaffMember> {
    const [row] = await this.db
      .update(schoolUsers)
      .set({ is_active, updated_at: new Date() })
      .where(and(eq(schoolUsers.id, id), eq(schoolUsers.school_id, schoolId)))
      .returning();
    return row;
  }
}
