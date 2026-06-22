import { examAttendance } from '@database/drizzle/schema/exam-attendance.schema';
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export type ExamAttendance = InferSelectModel<typeof examAttendance>;
export type NewExamAttendance = InferInsertModel<typeof examAttendance>;
