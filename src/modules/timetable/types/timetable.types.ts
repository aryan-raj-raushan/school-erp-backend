import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { timetables, timetablePeriodTimes, timetableEntries, timetableClassTeachers } from '../../../database/drizzle/schema/timetable.schema';

export type Timetable = InferSelectModel<typeof timetables>;
export type NewTimetable = InferInsertModel<typeof timetables>;

export type TimetablePeriodTime = InferSelectModel<typeof timetablePeriodTimes>;
export type NewTimetablePeriodTime = InferInsertModel<typeof timetablePeriodTimes>;

export type TimetableEntry = InferSelectModel<typeof timetableEntries>;
export type NewTimetableEntry = InferInsertModel<typeof timetableEntries>;

export type TimetableClassTeacher = InferSelectModel<typeof timetableClassTeachers>;
export type NewTimetableClassTeacher = InferInsertModel<typeof timetableClassTeachers>;

export interface TimetableFull {
  timetable: Timetable;
  period_times: TimetablePeriodTime[];
  entries: (TimetableEntry & { subject_name?: string | null; teacher_name?: string | null })[];
  class_teacher?: { id: string; teacher_id: string; teacher_name: string | null } | null;
  class_name?: string | null;
  class_detail_name?: string | null;
}
