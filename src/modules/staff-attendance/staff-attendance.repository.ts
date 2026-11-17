import { Injectable, Inject } from '@nestjs/common';
import { eq, and, gte, lte, asc, inArray, SQL } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import {
  staffAttendances,
  NewStaffAttendanceRow,
  StaffAttendanceRow,
} from '../../database/drizzle/schema/staff-attendance.schema';
import { schoolUsers } from '../../database/drizzle/schema/school-users.schema';
import { schools } from '../../database/drizzle/schema/schools.schema';

export type StaffAttendanceWithMeta = StaffAttendanceRow & {
  staff_first_name: string;
  staff_last_name: string | null;
  employee_code: string | null;
  staff_role: string | null;
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

  async insertPunch(data: NewStaffAttendanceRow): Promise<StaffAttendanceRow | undefined> {
    const [row] = await this.db
      .insert(staffAttendances)
      .values(data)
      .onConflictDoNothing()
      .returning();
    return row;
  }

  async findOne(
    schoolId: string,
    staffId: string,
    date: string,
  ): Promise<StaffAttendanceRow | undefined> {
    const [row] = await this.db
      .select()
      .from(staffAttendances)
      .where(
        and(
          eq(staffAttendances.school_id, schoolId),
          eq(staffAttendances.staff_id, staffId),
          eq(staffAttendances.date, date),
        ),
      )
      .limit(1);
    return row;
  }

  async findLockCandidates(schoolId: string, staffIds: string[], date: string) {
    if (!staffIds.length) return [];
    return this.db
      .select({
        staff_id: staffAttendances.staff_id,
        mode: staffAttendances.mode,
        date: staffAttendances.date,
      })
      .from(staffAttendances)
      .where(
        and(
          eq(staffAttendances.school_id, schoolId),
          inArray(staffAttendances.staff_id, staffIds),
          eq(staffAttendances.date, date),
        ),
      );
  }

  async findSchoolTimezone(schoolId: string): Promise<string> {
    const [row] = await this.db
      .select({ timezone: schools.timezone })
      .from(schools)
      .where(eq(schools.id, schoolId))
      .limit(1);
    return row?.timezone || 'Asia/Kolkata';
  }

  async findByDate(schoolId: string, date: string): Promise<StaffAttendanceWithMeta[]> {
    return this.findWhere(
      and(eq(staffAttendances.school_id, schoolId), eq(staffAttendances.date, date)),
    );
  }

  async findByRange(
    schoolId: string,
    startDate: string,
    endDate: string,
    role?: string,
  ): Promise<StaffAttendanceWithMeta[]> {
    const conditions: SQL[] = [
      eq(staffAttendances.school_id, schoolId),
      gte(staffAttendances.date, startDate),
      lte(staffAttendances.date, endDate),
    ];
    if (role) conditions.push(eq(schoolUsers.role, role as typeof schoolUsers.$inferSelect.role));
    return this.findWhere(and(...conditions));
  }

  private async findWhere(where: SQL | undefined): Promise<StaffAttendanceWithMeta[]> {
    const rows = await this.db
      .select({
        id: staffAttendances.id,
        school_id: staffAttendances.school_id,
        staff_id: staffAttendances.staff_id,
        date: staffAttendances.date,
        status: staffAttendances.status,
        remarks: staffAttendances.remarks,
        marked_by: staffAttendances.marked_by,
        mode: staffAttendances.mode,
        marked_at: staffAttendances.marked_at,
        latitude: staffAttendances.latitude,
        longitude: staffAttendances.longitude,
        location_accuracy_m: staffAttendances.location_accuracy_m,
        is_late: staffAttendances.is_late,
        created_at: staffAttendances.created_at,
        updated_at: staffAttendances.updated_at,
        staff_first_name: schoolUsers.first_name,
        staff_last_name: schoolUsers.last_name,
        employee_code: schoolUsers.employee_code,
        staff_role: schoolUsers.role,
      })
      .from(staffAttendances)
      .leftJoin(schoolUsers, eq(schoolUsers.id, staffAttendances.staff_id))
      .where(where)
      .orderBy(asc(staffAttendances.date), asc(schoolUsers.first_name));
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
