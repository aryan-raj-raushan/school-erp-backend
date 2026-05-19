import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { students } from '../../../database/drizzle/schema/students.schema';
import { studentDocuments } from '../../../database/drizzle/schema/student-documents.schema';
import { studentParents } from '../../../database/drizzle/schema/student-parents.schema';

export type Student = InferSelectModel<typeof students>;
export type NewStudent = InferInsertModel<typeof students>;
export type StudentDocument = InferSelectModel<typeof studentDocuments>;
export type NewStudentDocument = InferInsertModel<typeof studentDocuments>;
export type StudentParent = InferSelectModel<typeof studentParents>;
export type NewStudentParent = InferInsertModel<typeof studentParents>;

export interface StudentWithRelations extends Student {
  documents?: StudentDocument[];
  parents?: StudentParent[];
}
