import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { examHallDetails } from '@database/drizzle/schema';

export type ExamHallDetail = InferSelectModel<typeof examHallDetails>;
export type NewExamHallDetail = InferInsertModel<typeof examHallDetails>;
