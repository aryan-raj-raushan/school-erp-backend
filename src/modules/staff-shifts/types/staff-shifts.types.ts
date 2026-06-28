import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { staffShifts } from '../../../database/drizzle/schema/staff-shifts.schema';

export type StaffShift = InferSelectModel<typeof staffShifts>;
export type NewStaffShift = InferInsertModel<typeof staffShifts>;
