import { examGrading } from '@database/drizzle/schema/exam-grading.schema';
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export type ExamGrading = InferSelectModel<typeof examGrading>;
export type NewExamGrading = InferInsertModel<typeof examGrading>;
