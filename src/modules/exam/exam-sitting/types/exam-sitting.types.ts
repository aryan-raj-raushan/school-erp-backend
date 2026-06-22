import { examSittingPlans } from '@database/drizzle/schema/exam-sitting-plan.schema';
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export type ExamSittingPlan = InferSelectModel<typeof examSittingPlans>;
export type NewExamSittingPlan = InferInsertModel<typeof examSittingPlans>;
