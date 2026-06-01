import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { attendances } from '../../../database/drizzle/schema/attendance.schema';

export type Attendance = InferSelectModel<typeof attendances>;
export type NewAttendance = InferInsertModel<typeof attendances>;
