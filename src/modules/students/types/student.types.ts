import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { students } from '../../../database/drizzle/schema/students.schema';
import { studentDocuments } from '../../../database/drizzle/schema/student-documents.schema';
import { parents, parentStudentLinks } from '../../../database/drizzle/schema/parents.schema';

export type Student = InferSelectModel<typeof students>;
export type NewStudent = InferInsertModel<typeof students>;
export type StudentDocument = InferSelectModel<typeof studentDocuments>;
export type NewStudentDocument = InferInsertModel<typeof studentDocuments>;
export type Parent = InferSelectModel<typeof parents>;
export type NewParent = InferInsertModel<typeof parents>;
export type ParentStudentLink = InferSelectModel<typeof parentStudentLinks>;

export interface StudentParentView {
  id: string;
  link_id: string;
  school_id: string;
  student_id: string;
  first_name: string;
  last_name: string | null;
  dial_code: string;
  phone_number: string;
  alternate_phone: string | null;
  email: string | null;
  occupation: string | null;
  annual_income: string | null;
  aadhaar_number: string | null;
  profile_image: string | null;
  is_active: boolean;
  relation: string;
  is_primary: boolean;
  can_pickup: boolean;
  created_at: Date;
  updated_at: Date | null;
}

export interface CreateParentRepoData {
  id: string;
  link_id: string;
  school_id: string;
  student_id: string;
  first_name: string;
  last_name?: string;
  dial_code: string;
  phone_number: string;
  alternate_phone?: string;
  email?: string;
  occupation?: string;
  annual_income?: string;
  aadhaar_number?: string;
  relation: string;
  is_primary?: boolean;
  can_pickup?: boolean;
  created_by?: string;
}

export interface UpdateParentRepoData {
  first_name?: string;
  last_name?: string;
  dial_code?: string;
  phone_number?: string;
  alternate_phone?: string;
  email?: string;
  occupation?: string;
  annual_income?: string;
  aadhaar_number?: string;
  relation?: string;
  is_primary?: boolean;
  can_pickup?: boolean;
}

export interface StudentWithRelations extends Student {
  documents?: StudentDocument[];
  parents?: StudentParentView[];
}
