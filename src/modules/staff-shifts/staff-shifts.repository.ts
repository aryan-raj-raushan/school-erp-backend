import { Injectable, Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { staffShifts } from '../../database/drizzle/schema/staff-shifts.schema';
import { StaffShift } from './types/staff-shifts.types';

@Injectable()
export class StaffShiftsRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  async findAll(schoolId: string): Promise<StaffShift[]> {
    return this.db
      .select()
      .from(staffShifts)
      .where(eq(staffShifts.school_id, schoolId))
      .orderBy(staffShifts.effective_from);
  }

  async findByStaff(staffId: string, schoolId: string): Promise<StaffShift[]> {
    return this.db
      .select()
      .from(staffShifts)
      .where(and(eq(staffShifts.staff_id, staffId), eq(staffShifts.school_id, schoolId)))
      .orderBy(staffShifts.effective_from);
  }

  async findById(id: string, schoolId: string): Promise<StaffShift | undefined> {
    const [row] = await this.db
      .select()
      .from(staffShifts)
      .where(and(eq(staffShifts.id, id), eq(staffShifts.school_id, schoolId)));
    return row;
  }

  async findActiveForStaff(staffId: string, schoolId: string, date: string): Promise<StaffShift | undefined> {
    const rows = await this.db
      .select()
      .from(staffShifts)
      .where(
        and(
          eq(staffShifts.staff_id, staffId),
          eq(staffShifts.school_id, schoolId),
          eq(staffShifts.is_active, 'true'),
        ),
      );
    return rows.find((s) => s.effective_from <= date && s.effective_to >= date);
  }

  async create(data: Omit<StaffShift, 'created_at' | 'updated_at'>): Promise<StaffShift> {
    const [row] = await this.db.insert(staffShifts).values(data).returning();
    return row;
  }

  async update(
    id: string,
    schoolId: string,
    data: Partial<Omit<StaffShift, 'id' | 'school_id' | 'created_at'>>,
  ): Promise<StaffShift> {
    const [row] = await this.db
      .update(staffShifts)
      .set({ ...data, updated_at: new Date() })
      .where(and(eq(staffShifts.id, id), eq(staffShifts.school_id, schoolId)))
      .returning();
    return row;
  }

  async delete(id: string, schoolId: string): Promise<void> {
    await this.db
      .delete(staffShifts)
      .where(and(eq(staffShifts.id, id), eq(staffShifts.school_id, schoolId)));
  }
}
