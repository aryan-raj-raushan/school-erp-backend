import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { classSubjectTeachers } from '../../../database/drizzle/schema/class-subject-teachers.schema';

export type ClassSubjectTeacher = InferSelectModel<typeof classSubjectTeachers>;
export type NewClassSubjectTeacher = InferInsertModel<typeof classSubjectTeachers>;

export interface ClassSubjectTeacherWithNames extends ClassSubjectTeacher {
  subject_name: string;
  teacher_name: string;
}
