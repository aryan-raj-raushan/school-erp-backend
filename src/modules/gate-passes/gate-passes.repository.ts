import { Injectable, Inject } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { gatePasses } from '../../database/drizzle/schema/gate-passes.schema';
import { students } from '../../database/drizzle/schema/students.schema';
import { sql } from 'drizzle-orm';

@Injectable()
export class GatePassesRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  async create(data: typeof gatePasses.$inferInsert) {
    const [row] = await this.db.insert(gatePasses).values(data).returning();
    return row;
  }

  async findAll(schoolId: string, date?: string, status?: string, studentId?: string) {
    const conditions: ReturnType<typeof eq>[] = [
      eq(gatePasses.school_id, schoolId),
      eq(gatePasses.deleted, false),
    ];
    if (date) conditions.push(eq(gatePasses.date, date) as any);
    if (status) conditions.push(eq(gatePasses.status, status as any) as any);
    if (studentId) conditions.push(eq(gatePasses.student_id, studentId) as any);

    return this.db
      .select({
        id: gatePasses.id,
        student_id: gatePasses.student_id,
        student_name: sql<string>`${students.first_name} || ' ' || coalesce(${students.last_name}, '')`,
        date: gatePasses.date,
        reason: gatePasses.reason,
        exit_time: gatePasses.exit_time,
        return_time: gatePasses.return_time,
        qr_code: gatePasses.qr_code,
        status: gatePasses.status,
        approved_by: gatePasses.approved_by,
        approved_at: gatePasses.approved_at,
        used_at: gatePasses.used_at,
        created_at: gatePasses.created_at,
      })
      .from(gatePasses)
      .leftJoin(students, eq(students.id, gatePasses.student_id))
      .where(and(...conditions))
      .orderBy(desc(gatePasses.created_at));
  }

  async findById(id: string, schoolId: string) {
    const [row] = await this.db.select().from(gatePasses)
      .where(and(eq(gatePasses.id, id), eq(gatePasses.school_id, schoolId))).limit(1);
    return row ?? null;
  }

  async findByQr(qrCode: string) {
    const [row] = await this.db.select().from(gatePasses)
      .where(eq(gatePasses.qr_code, qrCode)).limit(1);
    return row ?? null;
  }

  async updateStatus(id: string, schoolId: string, patch: Partial<typeof gatePasses.$inferInsert>) {
    const [row] = await this.db.update(gatePasses).set(patch)
      .where(and(eq(gatePasses.id, id), eq(gatePasses.school_id, schoolId))).returning();
    return row;
  }

  async softDelete(id: string, schoolId: string) {
    await this.db.update(gatePasses).set({ deleted: true })
      .where(and(eq(gatePasses.id, id), eq(gatePasses.school_id, schoolId)));
  }
}
