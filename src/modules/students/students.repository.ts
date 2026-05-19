import { Injectable, Inject } from '@nestjs/common';
import { eq, and, ilike, or, sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { students } from '../../database/drizzle/schema/students.schema';
import { studentDocuments } from '../../database/drizzle/schema/student-documents.schema';
import { studentParents } from '../../database/drizzle/schema/student-parents.schema';
import { Student, NewStudent, StudentDocument, NewStudentDocument, StudentParent, NewStudentParent } from './types/student.types';
import { StudentFilterDto } from './dto/student-filter.dto';

@Injectable()
export class StudentsRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  async findAll(schoolId: string, filters: StudentFilterDto): Promise<Student[]> {
    const conditions = [
      eq(students.school_id, schoolId),
      eq(students.deleted, false),
    ];

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
    const conditions = [
      eq(students.school_id, schoolId),
      eq(students.deleted, false),
    ];

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
      .where(and(eq(students.id, id), eq(students.school_id, schoolId), eq(students.deleted, false)));
    return row;
  }

  async findByAdmissionNumber(schoolId: string, admissionNumber: string): Promise<Student | undefined> {
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

  async findDocumentById(id: string, studentId: string, schoolId: string): Promise<StudentDocument | undefined> {
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

  async findParents(studentId: string, schoolId: string): Promise<StudentParent[]> {
    return this.db
      .select()
      .from(studentParents)
      .where(
        and(
          eq(studentParents.student_id, studentId),
          eq(studentParents.school_id, schoolId),
          eq(studentParents.deleted, false),
        ),
      );
  }

  async findParentById(id: string, studentId: string, schoolId: string): Promise<StudentParent | undefined> {
    const [row] = await this.db
      .select()
      .from(studentParents)
      .where(
        and(
          eq(studentParents.id, id),
          eq(studentParents.student_id, studentId),
          eq(studentParents.school_id, schoolId),
          eq(studentParents.deleted, false),
        ),
      );
    return row;
  }

  async createParent(data: NewStudentParent): Promise<StudentParent> {
    const [row] = await this.db.insert(studentParents).values(data).returning();
    return row;
  }

  async updateParent(id: string, studentId: string, schoolId: string, data: Partial<NewStudentParent>): Promise<StudentParent> {
    const [row] = await this.db
      .update(studentParents)
      .set({ ...data, updated_at: new Date() })
      .where(
        and(
          eq(studentParents.id, id),
          eq(studentParents.student_id, studentId),
          eq(studentParents.school_id, schoolId),
        ),
      )
      .returning();
    return row;
  }

  async softDeleteParent(id: string, studentId: string, schoolId: string): Promise<void> {
    await this.db
      .update(studentParents)
      .set({ deleted: true, updated_at: new Date() })
      .where(
        and(
          eq(studentParents.id, id),
          eq(studentParents.student_id, studentId),
          eq(studentParents.school_id, schoolId),
        ),
      );
  }
}
