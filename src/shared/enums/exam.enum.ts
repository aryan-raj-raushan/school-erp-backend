export enum ExamTerm {
  TERM1 = 'TERM1',
  TERM2 = 'TERM2',
  TERM3 = 'TERM3',
  ANNUAL = 'ANNUAL',
}

export enum ExamStatus {
  DRAFT = 'DRAFT',
  UNDER_REVIEW = 'UNDER_REVIEW',
  PUBLISHED = 'PUBLISHED',
  STARTED = 'STARTED',
  COMPLETED = 'COMPLETED',
  LOCKED = 'LOCKED',
  ARCHIVED = 'ARCHIVED',
}

/** Allowed forward transitions. Admins may also be allowed to step back — not enforced here. */
export const EXAM_STATUS_TRANSITIONS: Record<ExamStatus, ExamStatus[]> = {
  [ExamStatus.DRAFT]: [ExamStatus.UNDER_REVIEW, ExamStatus.PUBLISHED],
  [ExamStatus.UNDER_REVIEW]: [ExamStatus.DRAFT, ExamStatus.PUBLISHED],
  [ExamStatus.PUBLISHED]: [ExamStatus.STARTED, ExamStatus.UNDER_REVIEW],
  [ExamStatus.STARTED]: [ExamStatus.COMPLETED],
  [ExamStatus.COMPLETED]: [ExamStatus.LOCKED],
  [ExamStatus.LOCKED]: [ExamStatus.ARCHIVED],
  [ExamStatus.ARCHIVED]: [],
};

export enum SubjectType {
  MAIN_EXAM = 'MAIN_EXAM',
  SECONDARY_EXAM = 'SECONDARY_EXAM',
  PRACTICAL_EXAM = 'PRACTICAL_EXAM',
  ORAL_EXAM = 'ORAL_EXAM',
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
}
