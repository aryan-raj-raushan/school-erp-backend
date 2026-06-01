import { Injectable, Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';

import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { companyUsers, schoolUsers, companyUserSchools, schools } from '../../database/drizzle/schema';
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
    const [user] = await this.db
      .insert(companyUsers)
      .values(data)
      .returning({
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
        created_at: schoolUsers.created_at,
      })
      .from(schoolUsers)
      .where(eq(schoolUsers.id, id));
    return user ?? null;
  }
}
