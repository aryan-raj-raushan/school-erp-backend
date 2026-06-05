import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { attendances } from '../../../database/drizzle/schema/attendance.schema';

export type Attendance = InferSelectModel<typeof attendances>;
export type NewAttendance = InferInsertModel<typeof attendances>;

export interface EnrichedAttendanceRecord extends Attendance {
  student_name: string;
  roll_number: string | null;
  admission_number: string;
  marked_by_username: string | null;
}

export interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  late: number;
}

export interface DailyAttendanceReport {
  date: string;
  class_section_id: string;
  class_section_name: string;
  stats: AttendanceStats;
  records: EnrichedAttendanceRecord[];
}

export interface StudentMonthSummary {
  student_id: string;
  student_name: string;
  roll_number: string | null;
  admission_number: string;
  total_days: number;
  present: number;
  absent: number;
  percentage: number;
}

export interface MonthlyAttendanceReport {
  class_section_id: string;
  class_section_name: string;
  year: number;
  month: number;
  stats: AttendanceStats & { total_students: number };
  student_summaries: StudentMonthSummary[];
  records: EnrichedAttendanceRecord[];
}

export interface AttendanceSummaryResponse {
  date: string;
  totalStudents: number;
  present: number;
  absent: number;
  unmarked: number;
  attendancePercent: number;
}

export interface MarkAttendanceResponse {
  records: Attendance[];
  summary: AttendanceSummaryResponse;
}

export interface DefaulterRecord {
  student_id: string;
  studentName: string;
  rollNo: string | null;
  admissionNo: string;
  total_days: number;
  total_present: number;
  total_absent: number;
  percentage: number;
}

export interface StudentAttendanceStats {
  total_days: number;
  present: number;
  absent: number;
  attendance_percentage: number;
}

export interface MonthlyBreakdown {
  year: number;
  month: number;
  present: number;
  absent: number;
  total: number;
  percent: number;
}

export interface StudentSummaryResponse {
  totalPresent: number;
  totalAbsent: number;
  totalDays: number;
  attendancePercent: number;
  fromDate: string | null;
  toDate: string | null;
  monthlyBreakdown: MonthlyBreakdown[];
}
