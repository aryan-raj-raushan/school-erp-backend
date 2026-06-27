export const REDIS_ADMISSION_KEY = {
  LIST_TTL: 21600,
  ITEM_TTL: 21600,
  HISTORY_TTL: 21600,
  ADMISSION_ENQUIRY: (schoolId: string) => `admission_enquiries:${schoolId}`,
};

export const REDIS_ADMISSION_SOURCE_KEY = {
  LIST_TTL: 21600,
  ITEM_TTL: 21600,
  ADMISSION_SOURCE: (schoolId: string) => `admission_sources:${schoolId}`,
};

export const REDI_HOLIDAY_EVENTS_KEY = {
  LIST_TTL: 21600,
  ITEM_TTL: 21600,
  SCHOOL_EVENTS: (schoolId: string) => `school_events:${schoolId}`,
};

export const REDIS_STUDENT_KEY = {
  CACHE_TTL: 21600,
  STUDENT: (schoolId: string) => `students:${schoolId}`,
};

export const REDIS_EXAM_KEYS = {
  // TTLs (seconds)
  LIST_TTL: 21600, // 6 hours
  ITEM_TTL: 21600,
  HISTORY_TTL: 21600,

  // ── Exam Setup / Grading ─────────────────────────────────────────────────
  GRADING: {
    LIST: (schoolId: string) => `exam:grading:${schoolId}:list`,
    ITEM: (schoolId: string, id: string) => `exam:grading:${schoolId}:${id}`,
  },

  // ── Exams ────────────────────────────────────────────────────────────────
  EXAM: {
    LIST: (schoolId: string) => `exam:${schoolId}:list`,
    ITEM: (schoolId: string, id: string) => `exam:${schoolId}:${id}`,
    PATTERN: (schoolId: string) => `exam:${schoolId}:*`,
  },

  // ── Exam Schedule ────────────────────────────────────────────────────────
  SCHEDULE: {
    LIST: (schoolId: string, examId: string) => `exam:schedule:${schoolId}:${examId}:list`,
    ITEM: (schoolId: string, id: string) => `exam:schedule:${schoolId}:${id}`,
    PATTERN: (schoolId: string) => `exam:schedule:${schoolId}:*`,
    EXAM_PATTERN: (schoolId: string, examId: string) => `exam:schedule:${schoolId}:${examId}:*`,
  },

  // ── Student Attendance ───────────────────────────────────────────────────
  ATTENDANCE: {
    LIST: (schoolId: string, examId: string, scheduleId: string) =>
      `exam:attendance:${schoolId}:${examId}:${scheduleId}:list`,
    PATTERN: (schoolId: string, examId: string) => `exam:attendance:${schoolId}:${examId}:*`,
    SCHOOL_PATTERN: (schoolId: string) => `exam:attendance:${schoolId}:*`,
  },

  // ── Hall Details ─────────────────────────────────────────────────────────
  HALL_DETAIL: {
    LIST: (schoolId: string, planId: string) => `exam:hall-detail:${schoolId}:${planId}:list`,
    ITEM: (schoolId: string, id: string) => `exam:hall-detail:${schoolId}:${id}`,
    PATTERN: (schoolId: string) => `exam:hall-detail:${schoolId}:*`,
    PLAN_PATTERN: (schoolId: string, planId: string) => `exam:hall-detail:${schoolId}:${planId}:*`,
  },

  // ── Sitting Plan ─────────────────────────────────────────────────────────
  SITTING: {
    LIST: (schoolId: string, examId: string) => `exam:sitting:${schoolId}:${examId}:list`,
    ITEM: (schoolId: string, id: string) => `exam:sitting:${schoolId}:${id}`,
    PATTERN: (schoolId: string, examId: string) => `exam:sitting:${schoolId}:${examId}:*`,
    SCHOOL_PATTERN: (schoolId: string) => `exam:sitting:${schoolId}:*`,
  },

  // ── Admit Card ───────────────────────────────────────────────────────────
  ADMIT_CARD: {
    ITEM: (schoolId: string, examId: string, studentId: string, academicYearId: string) =>
      `exam:admit-card:${schoolId}:${examId}:${studentId}:${academicYearId}`,
    EXAM_PATTERN: (schoolId: string, examId: string) => `exam:admit-card:${schoolId}:${examId}:*`,
  },

  // ── Attendance Card ──────────────────────────────────────────────────────
  ATTENDANCE_CARD: {
    ITEM: (schoolId: string, examId: string, classId: string, sectionId?: string) =>
      sectionId
        ? `exam:attendance-card:${schoolId}:${examId}:${classId}:${sectionId}`
        : `exam:attendance-card:${schoolId}:${examId}:${classId}`,
    EXAM_PATTERN: (schoolId: string, examId: string) =>
      `exam:attendance-card:${schoolId}:${examId}:*`,
  },
};

export const REDIS_EMPLOYEE_LEAVE_KEY = {
  LIST_TTL: 21600,
  ITEM_TTL: 21600,
  ASSIGNED_TTL: 21600,
  APPLICATION_TTL: 21600,

  LEAVE_TYPE: (schoolId: string) => `employee_leave:leave_types:${schoolId}`,
  LEAVE_ASSIGNED: (schoolId: string) => `employee_leave:assigned:${schoolId}`,
  LEAVE_APPLICATION: (schoolId: string) => `employee_leave:applications:${schoolId}`,
};
