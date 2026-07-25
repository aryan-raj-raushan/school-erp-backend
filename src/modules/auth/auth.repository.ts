import { Injectable, Inject } from '@nestjs/common';
import { eq, and, isNotNull } from 'drizzle-orm';

import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import {
  companyUsers,
  schoolUsers,
  companyUserSchools,
  schools,
  schoolRoleEnum,
  studentParents,
  students,
  studentAcademicInfo,
  classes,
  sections,
} from '../../database/drizzle/schema';
import { CompanyRole } from '../../shared/enums';

@Injectable()
export class AuthRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  async findCompanyUserByEmail(email: string) {
    const [user] = await this.db
      .select()
      .from(companyUsers)
      .where(and(eq(companyUsers.email, email), eq(companyUsers.deleted, false)));
    return user ?? null;
  }

  async findCompanyUserById(id: string) {
    const [user] = await this.db
      .select()
      .from(companyUsers)
      .where(and(eq(companyUsers.id, id), eq(companyUsers.deleted, false)));
    return user ?? null;
  }

  async findCompanyUserByEmailExists(email: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: companyUsers.id })
      .from(companyUsers)
      .where(eq(companyUsers.email, email));
    return !!row;
  }

  async superAdminExists(): Promise<boolean> {
    const [row] = await this.db
      .select({ id: companyUsers.id })
      .from(companyUsers)
      .where(and(eq(companyUsers.role, CompanyRole.SUPER_ADMIN), eq(companyUsers.deleted, false)))
      .limit(1);
    return !!row;
  }

  async createCompanyUser(data: {
    id: string;
    first_name: string;
    last_name?: string;
    email: string;
    password_hash: string;
    role: CompanyRole;
  }) {
    const [user] = await this.db.insert(companyUsers).values(data).returning({
      id: companyUsers.id,
      email: companyUsers.email,
      role: companyUsers.role,
      first_name: companyUsers.first_name,
    });
    return user;
  }

  async updateCompanyUserLastLogin(id: string): Promise<void> {
    await this.db
      .update(companyUsers)
      .set({ last_login_at: new Date() })
      .where(eq(companyUsers.id, id));
  }

  async findSchoolUserByPhone(phone_number: string, dial_code: string) {
    const [user] = await this.db
      .select()
      .from(schoolUsers)
      .where(
        and(
          eq(schoolUsers.phone_number, phone_number),
          eq(schoolUsers.dial_code, dial_code),
          eq(schoolUsers.deleted, false),
        ),
      );
    return user ?? null;
  }

  async findSchoolUserByEmail(email: string) {
    const [user] = await this.db
      .select()
      .from(schoolUsers)
      .where(and(eq(schoolUsers.email, email), eq(schoolUsers.deleted, false)));
    return user ?? null;
  }

  async createSchoolUserWithoutPassword(data: {
    id: string;
    school_id: string;
    first_name: string;
    last_name?: string;
    dial_code: string;
    phone_number: string;
    email?: string;
    created_by: string;
  }) {
    const [user] = await this.db
      .insert(schoolUsers)
      .values({
        ...data,
        role: 'SCHOOL_ADMIN',
        password_hash: null,
      })
      .returning({
        id: schoolUsers.id,
        school_id: schoolUsers.school_id,
        first_name: schoolUsers.first_name,
        last_name: schoolUsers.last_name,
        phone_number: schoolUsers.phone_number,
        email: schoolUsers.email,
        role: schoolUsers.role,
      });
    return user;
  }

  async findSchoolUserByPhoneGlobal(phone_number: string, dial_code: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: schoolUsers.id })
      .from(schoolUsers)
      .where(
        and(
          eq(schoolUsers.phone_number, phone_number),
          eq(schoolUsers.dial_code, dial_code),
          eq(schoolUsers.deleted, false),
        ),
      )
      .limit(1);
    return !!row;
  }

  async createSchoolUser(data: {
    id: string;
    school_id: string;
    first_name: string;
    last_name?: string;
    dial_code: string;
    phone_number: string;
    email?: string;
    password_hash: string;
    role: string;
    created_by: string;
    must_change_password?: boolean;
  }) {
    const [user] = await this.db
      .insert(schoolUsers)
      .values({ ...data, role: data.role as (typeof schoolRoleEnum.enumValues)[number] })
      .returning({
        id: schoolUsers.id,
        school_id: schoolUsers.school_id,
        first_name: schoolUsers.first_name,
        last_name: schoolUsers.last_name,
        phone_number: schoolUsers.phone_number,
        email: schoolUsers.email,
        role: schoolUsers.role,
      });
    return user;
  }

  async setSchoolUserPassword(userId: string, password_hash: string): Promise<void> {
    await this.db
      .update(schoolUsers)
      .set({ password_hash, must_change_password: false, updated_at: new Date() })
      .where(eq(schoolUsers.id, userId));
  }

  async findSchoolAdminBySchoolId(schoolId: string) {
    const [user] = await this.db
      .select({
        id: schoolUsers.id,
        first_name: schoolUsers.first_name,
        last_name: schoolUsers.last_name,
        email: schoolUsers.email,
        dial_code: schoolUsers.dial_code,
        phone_number: schoolUsers.phone_number,
      })
      .from(schoolUsers)
      .where(
        and(
          eq(schoolUsers.school_id, schoolId),
          eq(schoolUsers.role, 'SCHOOL_ADMIN'),
          eq(schoolUsers.deleted, false),
        ),
      )
      .limit(1);
    return user ?? null;
  }

  async updateSchoolUserProfile(
    id: string,
    data: Partial<{
      first_name: string;
      last_name: string;
      email: string;
      dial_code: string;
      phone_number: string;
    }>,
  ): Promise<void> {
    await this.db
      .update(schoolUsers)
      .set({ ...data, updated_at: new Date() })
      .where(eq(schoolUsers.id, id));
  }

  /** Super Admin-initiated password reset: forces a change on the admin's next login. */
  async adminResetSchoolUserPassword(userId: string, password_hash: string): Promise<void> {
    await this.db
      .update(schoolUsers)
      .set({ password_hash, must_change_password: true, updated_at: new Date() })
      .where(eq(schoolUsers.id, userId));
  }

  async findSchoolUserByPhoneExists(
    phone_number: string,
    dial_code: string,
    school_id: string,
  ): Promise<boolean> {
    const [row] = await this.db
      .select({ id: schoolUsers.id })
      .from(schoolUsers)
      .where(
        and(
          eq(schoolUsers.phone_number, phone_number),
          eq(schoolUsers.dial_code, dial_code),
          eq(schoolUsers.school_id, school_id),
          eq(schoolUsers.deleted, false),
        ),
      )
      .limit(1);
    return !!row;
  }

  async findSchoolUserById(id: string) {
    const [user] = await this.db
      .select()
      .from(schoolUsers)
      .where(and(eq(schoolUsers.id, id), eq(schoolUsers.deleted, false)));
    return user ?? null;
  }

  async updateSchoolUserLastLogin(id: string): Promise<void> {
    await this.db
      .update(schoolUsers)
      .set({ last_login_at: new Date() })
      .where(eq(schoolUsers.id, id));
  }

  async getCompanyUserSchoolIds(userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ school_id: companyUserSchools.school_id })
      .from(companyUserSchools)
      .where(eq(companyUserSchools.user_id, userId));
    return rows.map((r) => r.school_id);
  }

  async findSchoolById(id: string) {
    const [school] = await this.db
      .select({ id: schools.id, is_active: schools.is_active })
      .from(schools)
      .where(and(eq(schools.id, id), eq(schools.deleted, false)));
    return school ?? null;
  }

  async findActiveParentCandidatesByPhone(phone_number: string, dial_code: string) {
    return this.db
      .select({
        id: studentParents.id,
        student_id: studentParents.student_id,
        school_id: studentParents.school_id,
        phone_number: studentParents.phone_number,
        first_name: studentParents.first_name,
        last_name: studentParents.last_name,
        relation: studentParents.relation,
        password_hash: studentParents.password_hash,
        must_change_password: studentParents.must_change_password,
      })
      .from(studentParents)
      .where(
        and(
          eq(studentParents.phone_number, phone_number),
          eq(studentParents.dial_code, dial_code),
          eq(studentParents.deleted, false),
          eq(studentParents.is_active, true),
          isNotNull(studentParents.password_hash),
        ),
      );
  }

  /**
   * Every child linked to this phone number/dial code, active or not — used to
   * build the parent's "my children" switcher. Deliberately not scoped to one
   * school (the same phone can be a guardian at more than one school, same as
   * loginParent already allows), and deliberately not filtered by password_hash
   * (a child row missing a password shouldn't silently disappear from the list).
   */
  async findChildrenByPhone(phone_number: string, dial_code: string) {
    return this.db
      .select({
        parent_row_id: studentParents.id,
        student_id: studentParents.student_id,
        school_id: studentParents.school_id,
        relation: studentParents.relation,
        is_active: studentParents.is_active,
        student_first_name: students.first_name,
        student_last_name: students.last_name,
        student_status: students.status,
        class_name: classes.name,
        section_name: sections.name,
      })
      .from(studentParents)
      .innerJoin(students, eq(students.id, studentParents.student_id))
      .leftJoin(
        studentAcademicInfo,
        and(
          eq(studentAcademicInfo.student_id, students.id),
          eq(studentAcademicInfo.is_current, true),
        ),
      )
      .leftJoin(classes, eq(classes.id, studentAcademicInfo.class_id))
      .leftJoin(sections, eq(sections.id, studentAcademicInfo.section_id))
      .where(
        and(
          eq(studentParents.phone_number, phone_number),
          eq(studentParents.dial_code, dial_code),
          eq(studentParents.deleted, false),
        ),
      );
  }

  async updateParentLastLogin(id: string): Promise<void> {
    await this.db
      .update(studentParents)
      .set({ last_login_at: new Date() })
      .where(eq(studentParents.id, id));
  }

  async findParentById(id: string) {
    const [user] = await this.db
      .select()
      .from(studentParents)
      .where(and(eq(studentParents.id, id), eq(studentParents.deleted, false)));
    return user ?? null;
  }

  async setParentPassword(id: string, password_hash: string): Promise<void> {
    await this.db
      .update(studentParents)
      .set({ password_hash, must_change_password: false, updated_at: new Date() })
      .where(eq(studentParents.id, id));
  }

  async findCompanyUserProfile(id: string) {
    const [user] = await this.db
      .select({
        id: companyUsers.id,
        first_name: companyUsers.first_name,
        last_name: companyUsers.last_name,
        email: companyUsers.email,
        role: companyUsers.role,
        created_at: companyUsers.created_at,
      })
      .from(companyUsers)
      .where(eq(companyUsers.id, id));
    return user ?? null;
  }

  async findSchoolUserProfile(id: string) {
    const [user] = await this.db
      .select({
        id: schoolUsers.id,
        first_name: schoolUsers.first_name,
        last_name: schoolUsers.last_name,
        phone_number: schoolUsers.phone_number,
        email: schoolUsers.email,
        role: schoolUsers.role,
        school_id: schoolUsers.school_id,
        profile_image: schoolUsers.profile_image,
        custom_role_id: schoolUsers.custom_role_id,
        created_at: schoolUsers.created_at,
      })
      .from(schoolUsers)
      .where(eq(schoolUsers.id, id));
    return user ?? null;
  }

  async findParentProfileById(id: string) {
    const [parent] = await this.db
      .select({
        id: studentParents.id,
        first_name: studentParents.first_name,
        last_name: studentParents.last_name,
        phone_number: studentParents.phone_number,
        email: studentParents.email,
        school_id: studentParents.school_id,
        student_id: studentParents.student_id,
        profile_image: studentParents.profile_image,
        created_at: studentParents.created_at,
      })
      .from(studentParents)
      .where(eq(studentParents.id, id));
    return parent ?? null;
  }
}
