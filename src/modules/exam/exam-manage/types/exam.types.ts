import { exams } from '@database/drizzle/schema/exam.schema';
import { examClasses } from '@database/drizzle/schema/exam-classes.schema';
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export type Exam = InferSelectModel<typeof exams>;
export type NewExam = InferInsertModel<typeof exams>;
export type NewExamClass = InferInsertModel<typeof examClasses>;

/** Exam row enriched with the classes participating in it. */
export type ExamWithClasses = Exam & { class_ids: string[] };
