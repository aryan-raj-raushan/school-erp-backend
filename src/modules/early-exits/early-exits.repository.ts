import { Injectable, Inject } from '@nestjs/common';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { earlyExits } from '../../database/drizzle/schema/early-exits.schema';
import { students } from '../../database/drizzle/schema/students.schema';
import { sql } from 'drizzle-orm';

@Injectable()
export class EarlyExitsRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  async create(data: typeof earlyExits.$inferInsert) {
    const [row] = await this.db.insert(earlyExits).values(data).returning();
    return row;
  }

  async findAll(schoolId: string, date?: string) {
    const conditions = [eq(earlyExits.school_id, schoolId), eq(earlyExits.deleted, false)];
    if (date) conditions.push(eq(earlyExits.date, date));
    return this.db
      .select({
        id: earlyExits.id,
        student_id: earlyExits.student_id,
        student_name: sql<string>`${students.first_name} || ' ' || coalesce(${students.last_name}, '')`,
        date: earlyExits.date,
        exit_time: earlyExits.exit_time,
        reason: earlyExits.reason,
        status: earlyExits.status,
        remarks: earlyExits.remarks,
        approved_by: earlyExits.approved_by,
        approved_at: earlyExits.approved_at,
        created_at: earlyExits.created_at,
      })
      .from(earlyExits)
      .leftJoin(students, eq(students.id, earlyExits.student_id))
      .where(and(...conditions))
      .orderBy(desc(earlyExits.created_at));
  }

  async findById(id: string, schoolId: string) {
    const [row] = await this.db
      .select()
      .from(earlyExits)
      .where(and(eq(earlyExits.id, id), eq(earlyExits.school_id, schoolId)))
      .limit(1);
    return row ?? null;
  }

  async approve(id: string, schoolId: string, approvedBy: string) {
    const [row] = await this.db
      .update(earlyExits)
      .set({ status: 'APPROVED', approved_by: approvedBy, approved_at: new Date() })
      .where(and(eq(earlyExits.id, id), eq(earlyExits.school_id, schoolId)))
      .returning();
    return row;
  }

  async reject(id: string, schoolId: string) {
    const [row] = await this.db
      .update(earlyExits)
      .set({ status: 'REJECTED' })
      .where(and(eq(earlyExits.id, id), eq(earlyExits.school_id, schoolId)))
      .returning();
    return row;
  }

  async softDelete(id: string, schoolId: string) {
    await this.db
      .update(earlyExits)
      .set({ deleted: true })
      .where(and(eq(earlyExits.id, id), eq(earlyExits.school_id, schoolId)));
  }
}
