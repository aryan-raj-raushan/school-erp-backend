import { InferSelectModel } from 'drizzle-orm';
import { companyUsers } from '../../../database/drizzle/schema/company-users.schema';

export type CompanyUser = InferSelectModel<typeof companyUsers>;
export type CompanyUserProfile = Omit<CompanyUser, 'password_hash'>;

export interface AssignedSchool {
  school_id: string;
  school_name: string;
  granted_by: string;
  created_at: Date;
}
