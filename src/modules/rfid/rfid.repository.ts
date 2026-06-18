import { Injectable, Inject } from '@nestjs/common';
import { desc, eq, and, or, ilike } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import {
  rfidScanEvents,
  NewRfidScanEventRow,
  RfidScanEventRow,
} from '../../database/drizzle/schema/rfid-scan-events.schema';
import { schoolUsers } from '../../database/drizzle/schema/school-users.schema';
import { students } from '../../database/drizzle/schema/students.schema';

export type PersonRow = {
  id: string;
  name: string;
  type: 'staff' | 'student';
  rfidCardNumber: string | null;
};

@Injectable()
export class RfidRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  async insert(data: NewRfidScanEventRow): Promise<void> {
    await this.db.insert(rfidScanEvents).values(data).onConflictDoNothing();
  }

  async findRecent(limit = 100): Promise<RfidScanEventRow[]> {
    return this.db
      .select()
      .from(rfidScanEvents)
      .orderBy(desc(rfidScanEvents.received_at))
      .limit(limit);
  }

  async getAllPersonsWithRfid(
    schoolId: string,
  ): Promise<{ rfid: string; name: string; type: 'staff' | 'student'; id: string }[]> {
    const staffRows = await this.db
      .select({
        id: schoolUsers.id,
        first_name: schoolUsers.first_name,
        last_name: schoolUsers.last_name,
        rfid: schoolUsers.rfid_card_number,
      })
      .from(schoolUsers)
      .where(and(eq(schoolUsers.school_id, schoolId), eq(schoolUsers.deleted, false)));

    const studentRows = await this.db
      .select({
        id: students.id,
        first_name: students.first_name,
        last_name: students.last_name,
        rfid: students.id_card_number,
      })
      .from(students)
      .where(and(eq(students.school_id, schoolId), eq(students.deleted, false)));

    const result: { rfid: string; name: string; type: 'staff' | 'student'; id: string }[] = [];
    for (const r of staffRows) {
      if (r.rfid)
        result.push({
          rfid: r.rfid,
          name: `${r.first_name} ${r.last_name ?? ''}`.trim(),
          type: 'staff',
          id: r.id,
        });
    }
    for (const r of studentRows) {
      if (r.rfid)
        result.push({
          rfid: r.rfid,
          name: `${r.first_name} ${r.last_name ?? ''}`.trim(),
          type: 'student',
          id: r.id,
        });
    }
    return result;
  }

  async searchPersons(
    q: string,
    type: 'staff' | 'student' | 'all',
    schoolId: string,
  ): Promise<PersonRow[]> {
    const term = `%${q}%`;
    const result: PersonRow[] = [];

    if (type === 'staff' || type === 'all') {
      const rows = await this.db
        .select({
          id: schoolUsers.id,
          first_name: schoolUsers.first_name,
          last_name: schoolUsers.last_name,
          rfid: schoolUsers.rfid_card_number,
        })
        .from(schoolUsers)
        .where(
          and(
            eq(schoolUsers.school_id, schoolId),
            eq(schoolUsers.deleted, false),
            or(ilike(schoolUsers.first_name, term), ilike(schoolUsers.last_name, term)),
          ),
        )
        .limit(10);
      result.push(
        ...rows.map((r) => ({
          id: r.id,
          name: `${r.first_name} ${r.last_name ?? ''}`.trim(),
          type: 'staff' as const,
          rfidCardNumber: r.rfid ?? null,
        })),
      );
    }

    if (type === 'student' || type === 'all') {
      const rows = await this.db
        .select({
          id: students.id,
          first_name: students.first_name,
          last_name: students.last_name,
          rfid: students.id_card_number,
        })
        .from(students)
        .where(
          and(
            eq(students.school_id, schoolId),
            eq(students.deleted, false),
            or(ilike(students.first_name, term), ilike(students.last_name, term)),
          ),
        )
        .limit(10);
      result.push(
        ...rows.map((r) => ({
          id: r.id,
          name: `${r.first_name} ${r.last_name ?? ''}`.trim(),
          type: 'student' as const,
          rfidCardNumber: r.rfid ?? null,
        })),
      );
    }

    return result;
  }

  async assignToStaff(rfidCardId: string, staffId: string, schoolId: string): Promise<void> {
    await this.db
      .update(schoolUsers)
      .set({ rfid_card_number: rfidCardId })
      .where(and(eq(schoolUsers.id, staffId), eq(schoolUsers.school_id, schoolId)));
  }

  async assignToStudent(rfidCardId: string, studentId: string, schoolId: string): Promise<void> {
    await this.db
      .update(students)
      .set({ id_card_number: rfidCardId })
      .where(and(eq(students.id, studentId), eq(students.school_id, schoolId)));
  }

  async unassignFromStaff(staffId: string, schoolId: string): Promise<void> {
    await this.db
      .update(schoolUsers)
      .set({ rfid_card_number: null })
      .where(and(eq(schoolUsers.id, staffId), eq(schoolUsers.school_id, schoolId)));
  }

  async unassignFromStudent(studentId: string, schoolId: string): Promise<void> {
    await this.db
      .update(students)
      .set({ id_card_number: null })
      .where(and(eq(students.id, studentId), eq(students.school_id, schoolId)));
  }
}
