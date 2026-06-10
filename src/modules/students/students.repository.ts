import { Injectable, Inject } from '@nestjs/common';
import { eq, and, ilike, or, sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { students } from '../../database/drizzle/schema/students.schema';
import { studentDocuments } from '../../database/drizzle/schema/student-documents.schema';
import { parents, parentStudentLinks } from '../../database/drizzle/schema/parents.schema';
import {
  Student,
  NewStudent,
  StudentDocument,
  NewStudentDocument,
  StudentParentView,
  CreateParentRepoData,
  UpdateParentRepoData,
} from './types/student.types';
import { StudentFilterDto } from './dto/student-filter.dto';

@Injectable()
export class StudentsRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  async findAll(schoolId: string, filters: StudentFilterDto): Promise<Student[]> {
    const conditions = [eq(students.school_id, schoolId), eq(students.deleted, false)];

    if (filters.search) {
      const term = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(students.first_name, term),
          ilike(students.last_name, term),
          ilike(students.admission_number, term),
        )!,
      );
    }
    if (filters.class_id) {
      conditions.push(eq(students.class_id, filters.class_id));
    }
    if (filters.section_id) {
      conditions.push(eq(students.section_id, filters.section_id));
    }
    if (filters.academic_year_id) {
      conditions.push(eq(students.academic_year_id, filters.academic_year_id));
    }
    if (filters.status) {
      conditions.push(eq(students.status, filters.status));
    }
    if (filters.gender) {
      conditions.push(eq(students.gender, filters.gender));
    }

    const limit = filters.limit ?? 20;
    const offset = ((filters.page ?? 1) - 1) * limit;

    return this.db
      .select()
      .from(students)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset);
  }

  async count(schoolId: string, filters: StudentFilterDto): Promise<number> {
    const conditions = [eq(students.school_id, schoolId), eq(students.deleted, false)];

    if (filters.search) {
      const term = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(students.first_name, term),
          ilike(students.last_name, term),
          ilike(students.admission_number, term),
        )!,
      );
    }
    if (filters.class_id) {
      conditions.push(eq(students.class_id, filters.class_id));
    }
    if (filters.section_id) {
      conditions.push(eq(students.section_id, filters.section_id));
    }
    if (filters.academic_year_id) {
      conditions.push(eq(students.academic_year_id, filters.academic_year_id));
    }
    if (filters.status) {
      conditions.push(eq(students.status, filters.status));
    }
    if (filters.gender) {
      conditions.push(eq(students.gender, filters.gender));
    }

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(students)
      .where(and(...conditions));
    return Number(count);
  }

  async findById(id: string, schoolId: string): Promise<Student | undefined> {
    const [row] = await this.db
      .select()
      .from(students)
      .where(
        and(eq(students.id, id), eq(students.school_id, schoolId), eq(students.deleted, false)),
      );
    return row;
  }

  async findByAdmissionNumber(
    schoolId: string,
    admissionNumber: string,
  ): Promise<Student | undefined> {
    const [row] = await this.db
      .select()
      .from(students)
      .where(
        and(
          eq(students.school_id, schoolId),
          eq(students.admission_number, admissionNumber),
          eq(students.deleted, false),
        ),
      );
    return row;
  }

  async create(data: NewStudent): Promise<Student> {
    const [row] = await this.db.insert(students).values(data).returning();
    return row;
  }

  async update(id: string, schoolId: string, data: Partial<NewStudent>): Promise<Student> {
    const [row] = await this.db
      .update(students)
      .set({ ...data, updated_at: new Date() })
      .where(and(eq(students.id, id), eq(students.school_id, schoolId)))
      .returning();
    return row;
  }

  async softDelete(id: string, schoolId: string): Promise<void> {
    await this.db
      .update(students)
      .set({ deleted: true, is_active: false, updated_at: new Date() })
      .where(and(eq(students.id, id), eq(students.school_id, schoolId)));
  }

  // Document methods

  async findDocuments(studentId: string, schoolId: string): Promise<StudentDocument[]> {
    return this.db
      .select()
      .from(studentDocuments)
      .where(
        and(
          eq(studentDocuments.student_id, studentId),
          eq(studentDocuments.school_id, schoolId),
          eq(studentDocuments.deleted, false),
        ),
      );
  }

  async findDocumentById(
    id: string,
    studentId: string,
    schoolId: string,
  ): Promise<StudentDocument | undefined> {
    const [row] = await this.db
      .select()
      .from(studentDocuments)
      .where(
        and(
          eq(studentDocuments.id, id),
          eq(studentDocuments.student_id, studentId),
          eq(studentDocuments.school_id, schoolId),
          eq(studentDocuments.deleted, false),
        ),
      );
    return row;
  }

  async createDocument(data: NewStudentDocument): Promise<StudentDocument> {
    const [row] = await this.db.insert(studentDocuments).values(data).returning();
    return row;
  }

  async softDeleteDocument(id: string, studentId: string, schoolId: string): Promise<void> {
    await this.db
      .update(studentDocuments)
      .set({ deleted: true })
      .where(
        and(
          eq(studentDocuments.id, id),
          eq(studentDocuments.student_id, studentId),
          eq(studentDocuments.school_id, schoolId),
        ),
      );
  }

  // Parent methods

  private parentViewSelect() {
    return {
      id: parents.id,
      link_id: parentStudentLinks.id,
      school_id: parents.school_id,
      student_id: parentStudentLinks.student_id,
      first_name: parents.first_name,
      last_name: parents.last_name,
      dial_code: parents.dial_code,
      phone_number: parents.phone_number,
      alternate_phone: parents.alternate_phone,
      email: parents.email,
      occupation: parents.occupation,
      annual_income: parents.annual_income,
      aadhaar_number: parents.aadhaar_number,
      profile_image: parents.profile_image,
      is_active: parents.is_active,
      relation: parentStudentLinks.relation,
      is_primary: parentStudentLinks.is_primary,
      can_pickup: parentStudentLinks.can_pickup,
      created_at: parents.created_at,
      updated_at: parents.updated_at,
    };
  }

  async findParents(studentId: string, schoolId: string): Promise<StudentParentView[]> {
    return this.db
      .select(this.parentViewSelect())
      .from(parentStudentLinks)
      .innerJoin(parents, eq(parentStudentLinks.parent_id, parents.id))
      .where(
        and(
          eq(parentStudentLinks.student_id, studentId),
          eq(parentStudentLinks.school_id, schoolId),
          eq(parents.deleted, false),
        ),
      );
  }

  async findParentById(
    id: string,
    studentId: string,
    schoolId: string,
  ): Promise<StudentParentView | undefined> {
    const [row] = await this.db
      .select(this.parentViewSelect())
      .from(parentStudentLinks)
      .innerJoin(parents, eq(parentStudentLinks.parent_id, parents.id))
      .where(
        and(
          eq(parents.id, id),
          eq(parentStudentLinks.student_id, studentId),
          eq(parentStudentLinks.school_id, schoolId),
          eq(parents.deleted, false),
        ),
      );
    return row;
  }

  async createParent(data: CreateParentRepoData): Promise<StudentParentView> {
    let [existing] = await this.db
      .select()
      .from(parents)
      .where(
        and(
          eq(parents.phone_number, data.phone_number),
          eq(parents.dial_code, data.dial_code),
          eq(parents.school_id, data.school_id),
          eq(parents.deleted, false),
        ),
      );

    if (!existing) {
      [existing] = await this.db
        .insert(parents)
        .values({
          id: data.id,
          school_id: data.school_id,
          first_name: data.first_name,
          last_name: data.last_name,
          dial_code: data.dial_code,
          phone_number: data.phone_number,
          alternate_phone: data.alternate_phone,
          email: data.email,
          occupation: data.occupation,
          annual_income: data.annual_income,
          aadhaar_number: data.aadhaar_number,
          created_by: data.created_by,
        })
        .returning();
    }

    const [link] = await this.db
      .insert(parentStudentLinks)
      .values({
        id: data.link_id,
        school_id: data.school_id,
        parent_id: existing.id,
        student_id: data.student_id,
        relation: data.relation,
        is_primary: data.is_primary ?? false,
        can_pickup: data.can_pickup ?? true,
      })
      .returning();

    return {
      id: existing.id,
      link_id: link.id,
      school_id: existing.school_id,
      student_id: data.student_id,
      first_name: existing.first_name,
      last_name: existing.last_name ?? null,
      dial_code: existing.dial_code,
      phone_number: existing.phone_number,
      alternate_phone: existing.alternate_phone ?? null,
      email: existing.email ?? null,
      occupation: existing.occupation ?? null,
      annual_income: existing.annual_income ?? null,
      aadhaar_number: existing.aadhaar_number ?? null,
      profile_image: existing.profile_image ?? null,
      is_active: existing.is_active,
      relation: link.relation,
      is_primary: link.is_primary,
      can_pickup: link.can_pickup,
      created_at: existing.created_at,
      updated_at: existing.updated_at ?? null,
    };
  }

  async updateParent(
    id: string,
    studentId: string,
    schoolId: string,
    data: UpdateParentRepoData,
  ): Promise<StudentParentView> {
    const { relation, is_primary, can_pickup, ...parentFields } = data;

    if (Object.keys(parentFields).length > 0) {
      await this.db
        .update(parents)
        .set({ ...parentFields, updated_at: new Date() })
        .where(and(eq(parents.id, id), eq(parents.school_id, schoolId)));
    }

    const linkUpdate: Partial<typeof parentStudentLinks.$inferInsert> = {};
    if (relation !== undefined) linkUpdate.relation = relation;
    if (is_primary !== undefined) linkUpdate.is_primary = is_primary;
    if (can_pickup !== undefined) linkUpdate.can_pickup = can_pickup;

    if (Object.keys(linkUpdate).length > 0) {
      await this.db
        .update(parentStudentLinks)
        .set(linkUpdate)
        .where(
          and(
            eq(parentStudentLinks.parent_id, id),
            eq(parentStudentLinks.student_id, studentId),
            eq(parentStudentLinks.school_id, schoolId),
          ),
        );
    }

    return (await this.findParentById(id, studentId, schoolId))!;
  }

  async unlinkParent(id: string, studentId: string, schoolId: string): Promise<void> {
    await this.db
      .delete(parentStudentLinks)
      .where(
        and(
          eq(parentStudentLinks.parent_id, id),
          eq(parentStudentLinks.student_id, studentId),
          eq(parentStudentLinks.school_id, schoolId),
        ),
      );
  }
}
