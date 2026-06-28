import { Injectable, Inject } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { studentMovements } from '../../database/drizzle/schema/student-movements.schema';
import { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export type StudentMovement = InferSelectModel<typeof studentMovements>;
export type NewStudentMovement = InferInsertModel<typeof studentMovements>;

@Injectable()
export class StudentMovementsRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  async create(data: NewStudentMovement): Promise<StudentMovement> {
    const [row] = await this.db.insert(studentMovements).values(data).returning();
    return row;
  }

  async findAll(schoolId: string, filters: { student_id?: string; date?: string } = {}): Promise<StudentMovement[]> {
    const conditions = [eq(studentMovements.school_id, schoolId)];
    if (filters.student_id) conditions.push(eq(studentMovements.student_id, filters.student_id));
    if (filters.date) conditions.push(eq(studentMovements.date, filters.date));
    return this.db
      .select()
      .from(studentMovements)
      .where(and(...conditions))
      .orderBy(desc(studentMovements.tapped_at));
  }

  async findByStudent(studentId: string, schoolId: string, date?: string): Promise<StudentMovement[]> {
    const conditions = [
      eq(studentMovements.student_id, studentId),
      eq(studentMovements.school_id, schoolId),
    ];
    if (date) conditions.push(eq(studentMovements.date, date));
    return this.db
      .select()
      .from(studentMovements)
      .where(and(...conditions))
      .orderBy(desc(studentMovements.tapped_at));
  }

  async delete(id: string, schoolId: string): Promise<void> {
    await this.db
      .delete(studentMovements)
      .where(and(eq(studentMovements.id, id), eq(studentMovements.school_id, schoolId)));
  }
}
