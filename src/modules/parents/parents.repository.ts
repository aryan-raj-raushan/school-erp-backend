import { Injectable, Inject } from '@nestjs/common';
import { eq, and, or, ilike, sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { parents, parentStudentLinks } from '../../database/drizzle/schema/parents.schema';
import { students } from '../../database/drizzle/schema/students.schema';
import { Parent, NewParent } from './types/parent.types';
import { FilterParentDto } from './dto/filter-parent.dto';

@Injectable()
export class ParentsRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  private conditions(schoolId: string) {
    return [eq(parents.school_id, schoolId), eq(parents.deleted, false)];
  }

  async findAll(schoolId: string, filters: FilterParentDto): Promise<Parent[]> {
    const { page = 1, limit = 20, search } = filters;
    const offset = (page - 1) * limit;
    const conditions = this.conditions(schoolId);

    if (search) {
      conditions.push(
        or(
          ilike(parents.first_name, `%${search}%`),
          ilike(parents.last_name, `%${search}%`),
          ilike(parents.phone_number, `%${search}%`),
        )!,
      );
    }

    return this.db
      .select()
      .from(parents)
      .where(and(...conditions))
      .orderBy(parents.created_at)
      .limit(limit)
      .offset(offset);
  }

  async count(schoolId: string, filters: FilterParentDto): Promise<number> {
    const { search } = filters;
    const conditions = this.conditions(schoolId);

    if (search) {
      conditions.push(
        or(
          ilike(parents.first_name, `%${search}%`),
          ilike(parents.last_name, `%${search}%`),
          ilike(parents.phone_number, `%${search}%`),
        )!,
      );
    }

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(parents)
      .where(and(...conditions));
    return Number(count);
  }

  async findById(id: string, schoolId: string): Promise<Parent | undefined> {
    const [row] = await this.db
      .select()
      .from(parents)
      .where(and(eq(parents.id, id), ...this.conditions(schoolId)));
    return row;
  }

  async findByPhone(phone: string, dialCode: string, schoolId: string): Promise<Parent | undefined> {
    const [row] = await this.db
      .select()
      .from(parents)
      .where(
        and(
          eq(parents.phone_number, phone),
          eq(parents.dial_code, dialCode),
          ...this.conditions(schoolId),
        ),
      );
    return row;
  }

  async create(data: NewParent): Promise<Parent> {
    const [row] = await this.db.insert(parents).values(data).returning();
    return row;
  }

  async update(id: string, schoolId: string, data: Partial<NewParent>): Promise<Parent> {
    const [row] = await this.db
      .update(parents)
      .set({ ...data, updated_at: new Date() })
      .where(and(eq(parents.id, id), eq(parents.school_id, schoolId)))
      .returning();
    return row;
  }

  async softDelete(id: string, schoolId: string): Promise<void> {
    await this.db
      .update(parents)
      .set({ deleted: true, is_active: false, updated_at: new Date() })
      .where(and(eq(parents.id, id), eq(parents.school_id, schoolId)));
  }

  async linkStudent(
    linkId: string,
    parentId: string,
    studentId: string,
    schoolId: string,
    relation: string,
  ): Promise<void> {
    await this.db.insert(parentStudentLinks).values({
      id: linkId,
      school_id: schoolId,
      parent_id: parentId,
      student_id: studentId,
      relation,
    });
  }

  async getLinkedStudents(parentId: string, schoolId: string) {
    return this.db
      .select({
        student: students,
        relation: parentStudentLinks.relation,
        is_primary: parentStudentLinks.is_primary,
        link_id: parentStudentLinks.id,
      })
      .from(parentStudentLinks)
      .innerJoin(students, eq(parentStudentLinks.student_id, students.id))
      .where(
        and(
          eq(parentStudentLinks.parent_id, parentId),
          eq(parentStudentLinks.school_id, schoolId),
          eq(students.deleted, false),
        ),
      );
  }
}
