import { exams } from '@database/drizzle/schema/exam.schema';
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export type Exam = InferSelectModel<typeof exams>;
export type NewExam = InferInsertModel<typeof exams>;
