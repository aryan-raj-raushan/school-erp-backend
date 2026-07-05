export interface ExamAttendanceEntryRef {
  studentId: string;
  scheduleId: string;
}

/**
 * Fired from ExamAttendanceService.bulkMark() so exam-results can keep marks
 * entry in sync with attendance — an absentee shouldn't be markable, and a
 * correction back to present should re-open that cell.
 */
export interface ExamAttendanceSyncEvent {
  schoolId: string;
  academicYearId: string;
  examId: string;
  markedBy: string;
  entries: ExamAttendanceEntryRef[];
}
