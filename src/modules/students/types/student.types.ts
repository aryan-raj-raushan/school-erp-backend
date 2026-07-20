import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import {
  students,
  studentAcademicInfo,
  studentPreviousAcademics,
  studentAddresses,
  studentHostelInfo,
  studentParents,
  studentDocuments,
} from '../../../database/drizzle/schema/students.schema';

export type Student = InferSelectModel<typeof students>;
export type NewStudent = InferInsertModel<typeof students>;

export type StudentAcademicInfo = InferSelectModel<typeof studentAcademicInfo>;
export type NewStudentAcademicInfo = InferInsertModel<typeof studentAcademicInfo>;

export type StudentPreviousAcademics = InferSelectModel<typeof studentPreviousAcademics>;
export type NewStudentPreviousAcademics = InferInsertModel<typeof studentPreviousAcademics>;

export type StudentAddress = InferSelectModel<typeof studentAddresses>;
export type NewStudentAddress = InferInsertModel<typeof studentAddresses>;

export type StudentHostelInfo = InferSelectModel<typeof studentHostelInfo>;
export type NewStudentHostelInfo = InferInsertModel<typeof studentHostelInfo>;

export type StudentParent = InferSelectModel<typeof studentParents>;
export type NewStudentParent = InferInsertModel<typeof studentParents>;

/** Parent row shape safe to return from the API — never carries password_hash. */
export type StudentParentSafe = Omit<StudentParent, 'password_hash'> & { has_login: boolean };

export type StudentDocument = InferSelectModel<typeof studentDocuments>;
export type NewStudentDocument = InferInsertModel<typeof studentDocuments>;

export interface StudentFull {
  student: Student;
  academicInfo: StudentAcademicInfo | null;
  previousAcademics: StudentPreviousAcademics | null;
  address: StudentAddress | null;
  hostelInfo: StudentHostelInfo | null;
  parents: StudentParentSafe[];
  documents: StudentDocument[];
}

export interface StudentListItem {
  id: string;
  system_number: number;
  first_name: string;
  last_name: string | null;
  gender: string | null;
  date_of_birth: string | null;
  profile_image: string | null;
  status: string;
  is_enabled: boolean;
  phone_number: string | null;
  email: string | null;
  // joined from academic info
  academic_year_id: string | null;
  class_id: string | null;
  section_id: string | null;
  admission_number: string | null;
  roll_number: string | null;
  class_name: string | null;
  section_name: string | null;
  academic_year_name: string | null;
}

export interface StudentFilters {
  academic_year_id?: string;
  class_id?: string;
  section_id?: string;
  status?: string;
  gender?: string;
  search?: string;
  is_enabled?: boolean;
}
