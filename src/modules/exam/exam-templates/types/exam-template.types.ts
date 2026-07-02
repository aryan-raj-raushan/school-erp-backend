import { examTemplates } from '@database/drizzle/schema/exam-templates.schema';
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export type ExamTemplate = InferSelectModel<typeof examTemplates>;
export type NewExamTemplate = InferInsertModel<typeof examTemplates>;
