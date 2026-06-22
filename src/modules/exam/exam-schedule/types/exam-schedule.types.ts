import { examSchedules } from '@database/drizzle/schema/exam-schedule.schema';
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export type ExamSchedule = InferSelectModel<typeof examSchedules>;
export type NewExamSchedule = InferInsertModel<typeof examSchedules>;
