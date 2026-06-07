import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { timetableSessions } from '../../../database/drizzle/schema/timetable-sessions.schema';

export type TimetableSession = InferSelectModel<typeof timetableSessions>;
export type NewTimetableSession = InferInsertModel<typeof timetableSessions>;
