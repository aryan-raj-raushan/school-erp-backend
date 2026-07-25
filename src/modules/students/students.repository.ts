import { Injectable, Inject } from '@nestjs/common';
import { eq, and, or, ilike, inArray, sql, SQL } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import {
  students,
  studentAcademicInfo,
  studentPreviousAcademics,
  studentAddresses,
  studentHostelInfo,
  studentParents,
  studentDocuments,
  schoolStudentCounters,
} from '../../database/drizzle/schema/students.schema';
import { classes } from '../../database/drizzle/schema/classes.schema';
import { sections } from '../../database/drizzle/schema/sections.schema';
import { academicYears } from '../../database/drizzle/schema/academic-years.schema';
import { schools } from '../../database/drizzle/schema/schools.schema';
import {
  Student,
  NewStudent,
  StudentAcademicInfo,
  NewStudentAcademicInfo,
  StudentPreviousAcademics,
  NewStudentPreviousAcademics,
  StudentAddress,
  NewStudentAddress,
  StudentHostelInfo,
  NewStudentHostelInfo,
  NewStudentParent,
  StudentParentSafe,
  StudentDocument,
  NewStudentDocument,
  StudentFilters,
  StudentListItem,
} from './types/student.types';

@Injectable()
export class StudentsRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  // ─── System Number ──────────────────────────────────────────────────────────

  async nextSystemNumber(schoolId: string): Promise<number> {
    // Upsert counter and return incremented value
    const [row] = await this.db
      .insert(schoolStudentCounters)
      .values({ school_id: schoolId, last_number: 1 })
      .onConflictDoUpdate({
        target: schoolStudentCounters.school_id,
        set: {
          last_number: sql`${schoolStudentCounters.last_number} + 1`,
          updated_at: new Date(),
        },
      })
      .returning({ last_number: schoolStudentCounters.last_number });
    return row.last_number;
  }

  // ─── Students ───────────────────────────────────────────────────────────────

  async findAll(schoolId: string, filters: StudentFilters): Promise<StudentListItem[]> {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const conditions: SQL<unknown>[] = [
      eq(students.school_id, schoolId),
      eq(students.deleted, false),
    ];

    if (filters.status) conditions.push(eq(students.status, filters.status as any));
    if (filters.gender) conditions.push(eq(students.gender, filters.gender as any));
    if (filters.is_enabled !== undefined)
      conditions.push(eq(students.is_enabled, filters.is_enabled));

    if (filters.search) {
      const term = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(students.first_name, term),
          ilike(students.last_name, term),
          ilike(students.phone_number, term),
          ilike(students.email, term),
          ilike(students.aadhaar_number, term),
        ) as SQL,
      );
    }

    // Academic info filters (join-based)
    const acaConditions: SQL[] = [
      eq(studentAcademicInfo.student_id, students.id),
      eq(studentAcademicInfo.is_current, true),
    ];
    if (filters.academic_year_id)
      acaConditions.push(eq(studentAcademicInfo.academic_year_id, filters.academic_year_id));
    if (filters.class_id) acaConditions.push(eq(studentAcademicInfo.class_id, filters.class_id));
    if (filters.section_id)
      acaConditions.push(eq(studentAcademicInfo.section_id, filters.section_id));

    // If academic filters present, do inner join; otherwise left join
    const hasAcaFilter = filters.academic_year_id || filters.class_id || filters.section_id;

    return this.db
      .select({
        id: students.id,
        system_number: students.system_number,
        first_name: students.first_name,
        last_name: students.last_name,
        gender: students.gender,
        date_of_birth: students.date_of_birth,
        profile_image: students.profile_image,
        status: students.status,
        is_enabled: students.is_enabled,
        phone_number: students.phone_number,
        email: students.email,
        academic_year_id: studentAcademicInfo.academic_year_id,
        class_id: studentAcademicInfo.class_id,
        section_id: studentAcademicInfo.section_id,
        admission_number: studentAcademicInfo.admission_number,
        roll_number: studentAcademicInfo.roll_number,
        class_name: classes.name,
        section_name: sections.name,
        academic_year_name: academicYears.name,
      })
      .from(students)
      [hasAcaFilter ? 'innerJoin' : 'leftJoin'](studentAcademicInfo, and(...acaConditions))
      .leftJoin(classes, eq(studentAcademicInfo.class_id, classes.id))
      .leftJoin(sections, eq(studentAcademicInfo.section_id, sections.id))
      .leftJoin(academicYears, eq(studentAcademicInfo.academic_year_id, academicYears.id))
      .where(and(...conditions))
      .orderBy(students.first_name) as Promise<StudentListItem[]>;
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
      .set({ deleted: true, updated_at: new Date() })
      .where(and(eq(students.id, id), eq(students.school_id, schoolId)));
  }

  // ─── Academic Info ──────────────────────────────────────────────────────────

  async findCurrentAcademicInfo(
    studentId: string,
    schoolId: string,
  ): Promise<StudentAcademicInfo | undefined> {
    const [row] = await this.db
      .select()
      .from(studentAcademicInfo)
      .where(
        and(
          eq(studentAcademicInfo.student_id, studentId),
          eq(studentAcademicInfo.school_id, schoolId),
          eq(studentAcademicInfo.is_current, true),
          eq(studentAcademicInfo.deleted, false),
        ),
      );
    return row;
  }

  async findAllAcademicInfo(studentId: string, schoolId: string): Promise<StudentAcademicInfo[]> {
    return this.db
      .select()
      .from(studentAcademicInfo)
      .where(
        and(
          eq(studentAcademicInfo.student_id, studentId),
          eq(studentAcademicInfo.school_id, schoolId),
          eq(studentAcademicInfo.deleted, false),
        ),
      );
  }

  async upsertAcademicInfo(data: NewStudentAcademicInfo): Promise<StudentAcademicInfo> {
    // Mark all existing as not current first
    await this.db
      .update(studentAcademicInfo)
      .set({ is_current: false })
      .where(
        and(
          eq(studentAcademicInfo.student_id, data.student_id),
          eq(studentAcademicInfo.school_id, data.school_id!),
        ),
      );

    const [row] = await this.db.insert(studentAcademicInfo).values(data).returning();
    return row;
  }

  async updateAcademicInfo(
    id: string,
    schoolId: string,
    data: Partial<NewStudentAcademicInfo>,
  ): Promise<StudentAcademicInfo> {
    const [row] = await this.db
      .update(studentAcademicInfo)
      .set({ ...data, updated_at: new Date() })
      .where(and(eq(studentAcademicInfo.id, id), eq(studentAcademicInfo.school_id, schoolId)))
      .returning();
    return row;
  }

  // ─── Previous Academics ─────────────────────────────────────────────────────

  async findPreviousAcademics(
    studentId: string,
    schoolId: string,
  ): Promise<StudentPreviousAcademics | undefined> {
    const [row] = await this.db
      .select()
      .from(studentPreviousAcademics)
      .where(
        and(
          eq(studentPreviousAcademics.student_id, studentId),
          eq(studentPreviousAcademics.school_id, schoolId),
          eq(studentPreviousAcademics.deleted, false),
        ),
      );
    return row;
  }

  async upsertPreviousAcademics(
    data: NewStudentPreviousAcademics,
  ): Promise<StudentPreviousAcademics> {
    const existing = await this.findPreviousAcademics(data.student_id, data.school_id!);
    if (existing) {
      const [row] = await this.db
        .update(studentPreviousAcademics)
        .set({ ...data, updated_at: new Date() })
        .where(eq(studentPreviousAcademics.id, existing.id))
        .returning();
      return row;
    }
    const [row] = await this.db.insert(studentPreviousAcademics).values(data).returning();
    return row;
  }

  // ─── Address ────────────────────────────────────────────────────────────────

  async findAddress(studentId: string, schoolId: string): Promise<StudentAddress | undefined> {
    const [row] = await this.db
      .select()
      .from(studentAddresses)
      .where(
        and(
          eq(studentAddresses.student_id, studentId),
          eq(studentAddresses.school_id, schoolId),
          eq(studentAddresses.deleted, false),
        ),
      );
    return row;
  }

  async upsertAddress(data: NewStudentAddress): Promise<StudentAddress> {
    const existing = await this.findAddress(data.student_id, data.school_id!);
    if (existing) {
      const [row] = await this.db
        .update(studentAddresses)
        .set({ ...data, updated_at: new Date() })
        .where(eq(studentAddresses.id, existing.id))
        .returning();
      return row;
    }
    const [row] = await this.db.insert(studentAddresses).values(data).returning();
    return row;
  }

  // ─── Hostel Info ────────────────────────────────────────────────────────────

  async findHostelInfo(
    studentId: string,
    schoolId: string,
  ): Promise<StudentHostelInfo | undefined> {
    const [row] = await this.db
      .select()
      .from(studentHostelInfo)
      .where(
        and(
          eq(studentHostelInfo.student_id, studentId),
          eq(studentHostelInfo.school_id, schoolId),
          eq(studentHostelInfo.deleted, false),
        ),
      );
    return row;
  }

  async upsertHostelInfo(data: NewStudentHostelInfo): Promise<StudentHostelInfo> {
    const existing = await this.findHostelInfo(data.student_id, data.school_id!);
    if (existing) {
      const [row] = await this.db
        .update(studentHostelInfo)
        .set({ ...data, updated_at: new Date() })
        .where(eq(studentHostelInfo.id, existing.id))
        .returning();
      return row;
    }
    const [row] = await this.db.insert(studentHostelInfo).values(data).returning();
    return row;
  }

  // ─── Parents ────────────────────────────────────────────────────────────────

  async findAllGuardians(
    schoolId: string,
    search?: string,
    studentId?: string,
  ): Promise<
    {
      id: string;
      student_id: string;
      student_name: string;
      relation: string;
      first_name: string;
      last_name: string | null;
      phone_number: string;
      dial_code: string | null;
      email: string | null;
      occupation: string | null;
      is_primary: boolean;
      can_pickup: boolean;
    }[]
  > {
    const rows = await this.db
      .select({
        id: studentParents.id,
        student_id: students.id,
        student_first_name: students.first_name,
        student_last_name: students.last_name,
        relation: studentParents.relation,
        first_name: studentParents.first_name,
        last_name: studentParents.last_name,
        phone_number: studentParents.phone_number,
        dial_code: studentParents.dial_code,
        email: studentParents.email,
        occupation: studentParents.occupation,
        is_primary: studentParents.is_primary,
        can_pickup: studentParents.can_pickup,
      })
      .from(studentParents)
      .innerJoin(students, eq(students.id, studentParents.student_id))
      .where(
        and(
          eq(studentParents.school_id, schoolId),
          eq(studentParents.deleted, false),
          eq(students.deleted, false),
          ...(studentId ? [eq(studentParents.student_id, studentId)] : []),
          ...(search
            ? [
                or(
                  ilike(studentParents.first_name, `%${search}%`),
                  ilike(studentParents.last_name, `%${search}%`),
                  ilike(studentParents.phone_number, `%${search}%`),
                  ilike(students.first_name, `%${search}%`),
                  ilike(students.last_name, `%${search}%`),
                ),
              ]
            : []),
        ),
      )
      .orderBy(students.first_name, studentParents.is_primary);
    return rows.map((r) => ({
      ...r,
      student_name: [r.student_first_name, r.student_last_name].filter(Boolean).join(' '),
    }));
  }

  /** Column projection for parent rows returned to callers — never includes password_hash. */
  private readonly parentSafeColumns = {
    id: studentParents.id,
    school_id: studentParents.school_id,
    student_id: studentParents.student_id,
    relation: studentParents.relation,
    first_name: studentParents.first_name,
    last_name: studentParents.last_name,
    email: studentParents.email,
    dial_code: studentParents.dial_code,
    phone_number: studentParents.phone_number,
    alternate_phone: studentParents.alternate_phone,
    occupation: studentParents.occupation,
    qualification: studentParents.qualification,
    annual_income: studentParents.annual_income,
    aadhaar_number: studentParents.aadhaar_number,
    profile_image: studentParents.profile_image,
    is_primary: studentParents.is_primary,
    can_pickup: studentParents.can_pickup,
    must_change_password: studentParents.must_change_password,
    is_active: studentParents.is_active,
    last_login_at: studentParents.last_login_at,
    has_login: sql<boolean>`${studentParents.password_hash} is not null`,
    deleted: studentParents.deleted,
    created_at: studentParents.created_at,
    updated_at: studentParents.updated_at,
  };

  async addGuardian(data: NewStudentParent): Promise<StudentParentSafe> {
    const [row] = await this.db
      .insert(studentParents)
      .values(data)
      .returning(this.parentSafeColumns);
    return row;
  }

  async findGuardianById(id: string, schoolId: string): Promise<StudentParentSafe | null> {
    const [row] = await this.db
      .select(this.parentSafeColumns)
      .from(studentParents)
      .where(and(eq(studentParents.id, id), eq(studentParents.school_id, schoolId)));
    return row ?? null;
  }

  async removeGuardian(id: string, schoolId: string): Promise<void> {
    await this.db
      .update(studentParents)
      .set({ deleted: true, updated_at: new Date() })
      .where(and(eq(studentParents.id, id), eq(studentParents.school_id, schoolId)));
  }

  async findParents(studentId: string, schoolId: string): Promise<StudentParentSafe[]> {
    return this.db
      .select(this.parentSafeColumns)
      .from(studentParents)
      .where(
        and(
          eq(studentParents.student_id, studentId),
          eq(studentParents.school_id, schoolId),
          eq(studentParents.deleted, false),
        ),
      );
  }

  /**
   * Syncs the incoming parent rows for a student: soft-deletes rows the caller removed,
   * inserts rows with no matching existing id, and updates rows that do — preserving
   * password_hash for any row that isn't given a new one (see StudentsService.buildParentRows).
   */
  async syncParents(
    studentId: string,
    schoolId: string,
    incoming: (NewStudentParent & { id: string })[],
  ): Promise<StudentParentSafe[]> {
    const existing = await this.db
      .select({ id: studentParents.id })
      .from(studentParents)
      .where(
        and(
          eq(studentParents.student_id, studentId),
          eq(studentParents.school_id, schoolId),
          eq(studentParents.deleted, false),
        ),
      );
    const existingIds = new Set(existing.map((r) => r.id));
    const incomingIds = new Set(incoming.map((p) => p.id));

    const removedIds = [...existingIds].filter((id) => !incomingIds.has(id));
    if (removedIds.length) {
      await this.db
        .update(studentParents)
        .set({ deleted: true, updated_at: new Date() })
        .where(and(inArray(studentParents.id, removedIds), eq(studentParents.school_id, schoolId)));
    }

    const toInsert = incoming.filter((p) => !existingIds.has(p.id));
    const toUpdate = incoming.filter((p) => existingIds.has(p.id));

    const results: StudentParentSafe[] = [];

    if (toInsert.length) {
      const inserted = await this.db
        .insert(studentParents)
        .values(toInsert)
        .returning(this.parentSafeColumns);
      results.push(...inserted);
    }

    for (const p of toUpdate) {
      const { id, ...rest } = p;
      const [row] = await this.db
        .update(studentParents)
        .set({ ...rest, updated_at: new Date() })
        .where(eq(studentParents.id, id))
        .returning(this.parentSafeColumns);
      results.push(row);
    }

    return results;
  }

  // ─── Documents ──────────────────────────────────────────────────────────────

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

  async addDocuments(data: NewStudentDocument[]): Promise<StudentDocument[]> {
    if (!data.length) return [];
    return this.db.insert(studentDocuments).values(data).returning();
  }

  async deleteDocument(id: string, studentId: string, schoolId: string): Promise<void> {
    await this.db
      .update(studentDocuments)
      .set({ deleted: true, updated_at: new Date() })
      .where(
        and(
          eq(studentDocuments.id, id),
          eq(studentDocuments.student_id, studentId),
          eq(studentDocuments.school_id, schoolId),
        ),
      );
  }

  async replaceDocuments(
    studentId: string,
    schoolId: string,
    data: NewStudentDocument[],
  ): Promise<StudentDocument[]> {
    await this.db
      .update(studentDocuments)
      .set({ deleted: true, updated_at: new Date() })
      .where(
        and(eq(studentDocuments.student_id, studentId), eq(studentDocuments.school_id, schoolId)),
      );

    if (!data.length) return [];
    return this.db.insert(studentDocuments).values(data).returning();
  }

  // ─── ID Card data ───────────────────────────────────────────────────────────

  async findStudentForIdCard(studentId: string, schoolId: string) {
    const [row] = await this.db
      .select({
        // Student
        id: students.id,
        system_number: students.system_number,
        first_name: students.first_name,
        last_name: students.last_name,
        profile_image: students.profile_image,
        gender: students.gender,
        blood_group: students.blood_group,
        phone_number: students.phone_number,
        // Academic
        admission_number: studentAcademicInfo.admission_number,
        roll_number: studentAcademicInfo.roll_number,
        class_name: classes.name,
        section_name: sections.name,
        // Address (joined separately below)
        // School
        school_name: schools.name,
        school_address: schools.address,
        school_city: schools.city,
        school_logo: schools.logo_url,
        school_phone: schools.contact_number,
        school_email: schools.email,
        school_website: schools.website,
      })
      .from(students)
      .leftJoin(
        studentAcademicInfo,
        and(
          eq(studentAcademicInfo.student_id, students.id),
          eq(studentAcademicInfo.is_current, true),
        ),
      )
      .leftJoin(classes, eq(studentAcademicInfo.class_id, classes.id))
      .leftJoin(sections, eq(studentAcademicInfo.section_id, sections.id))
      .leftJoin(schools, eq(students.school_id, schools.id))
      .where(
        and(
          eq(students.id, studentId),
          eq(students.school_id, schoolId),
          eq(students.deleted, false),
        ),
      );

    return row;
  }

  async findStudentForPickupCard(studentId: string, schoolId: string) {
    const studentData = await this.findStudentForIdCard(studentId, schoolId);
    const parents = await this.findParents(studentId, schoolId);
    return { student: studentData, parents };
  }
}
