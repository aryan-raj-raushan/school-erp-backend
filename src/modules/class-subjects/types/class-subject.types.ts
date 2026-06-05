import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { classSectionSubjects } from '../../../database/drizzle/schema/class-section-subjects.schema';

export type ClassSectionSubject = InferSelectModel<typeof classSectionSubjects>;
export type NewClassSectionSubject = InferInsertModel<typeof classSectionSubjects>;
