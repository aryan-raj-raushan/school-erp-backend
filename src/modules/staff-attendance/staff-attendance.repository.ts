import { Injectable, Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import {
  staffAttendances,
  NewStaffAttendanceRow,
  StaffAttendanceRow,
} from '../../database/drizzle/schema/staff-attendance.schema';
import { schoolUsers } from '../../database/drizzle/schema/school-users.schema';

export type StaffAttendanceWithMeta = StaffAttendanceRow & {
  staff_first_name: string;
  staff_last_name: string | null;
  employee_code: string | null;
};

@Injectable()
export class StaffAttendanceRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  async upsert(data: NewStaffAttendanceRow): Promise<StaffAttendanceRow> {
    const [row] = await this.db
      .insert(staffAttendances)
      .values(data)
      .onConflictDoUpdate({
        target: [staffAttendances.staff_id, staffAttendances.date],
        set: {
          status: data.status,
          is_late: data.is_late,
          remarks: data.remarks,
          marked_by: data.marked_by,
          updated_at: new Date(),
        },
      })
      .returning();
    return row;
  }

  async findByDate(schoolId: string, date: string): Promise<StaffAttendanceWithMeta[]> {
    const rows = await this.db
      .select({
        id: staffAttendances.id,
        school_id: staffAttendances.school_id,
        staff_id: staffAttendances.staff_id,
        date: staffAttendances.date,
        status: staffAttendances.status,
        remarks: staffAttendances.remarks,
        marked_by: staffAttendances.marked_by,
        is_late: staffAttendances.is_late,
        created_at: staffAttendances.created_at,
        updated_at: staffAttendances.updated_at,
        staff_first_name: schoolUsers.first_name,
        staff_last_name: schoolUsers.last_name,
        employee_code: schoolUsers.employee_code,
      })
      .from(staffAttendances)
      .leftJoin(schoolUsers, eq(schoolUsers.id, staffAttendances.staff_id))
      .where(and(eq(staffAttendances.school_id, schoolId), eq(staffAttendances.date, date)));
    return rows as StaffAttendanceWithMeta[];
  }

  async findAllStaff(schoolId: string) {
    return this.db
      .select({
        id: schoolUsers.id,
        first_name: schoolUsers.first_name,
        last_name: schoolUsers.last_name,
        employee_code: schoolUsers.employee_code,
        role: schoolUsers.role,
      })
      .from(schoolUsers)
      .where(and(eq(schoolUsers.school_id, schoolId), eq(schoolUsers.deleted, false)));
  }
}
