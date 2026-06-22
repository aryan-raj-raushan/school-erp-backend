import { examHallDetails } from '@database/drizzle/schema/exam-hall-details.schema';
import { examHallPlans } from '@database/drizzle/schema/exam-hall-plan.schema';
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export type ExamHallPlan = InferSelectModel<typeof examHallPlans>;
export type NewExamHallPlan = InferInsertModel<typeof examHallPlans>;

export type ExamHallDetail = InferSelectModel<typeof examHallDetails>;
export type NewExamHallDetail = InferInsertModel<typeof examHallDetails>;
