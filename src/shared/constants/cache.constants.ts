export const CacheTTL = {
  SHORT: 60, // attendance, dashboard
  MEDIUM: 120, // students-list, staff, subscriptions, fees, academics, exams, leave, comms, parents, sections
  LONG: 300, // student-item, classes, departments, schools, holidays, class-details, syllabi, subjects, class-types, academic-years
  HOUR: 3600, // master-data, company-schools (rarely changes)
} as const;

export const AuthTTL = {
  ACCESS_TOKEN_SECONDS: 15 * 60,
  REFRESH_TOKEN_SECONDS: 7 * 24 * 60 * 60,
  COMPANY_SCHOOLS_SECONDS: 3600,
} as const;

export const JobTTL = {
  BULK_JOB_SECONDS: 24 * 60 * 60,
  INVITE_SECONDS: 7 * 24 * 60 * 60,
} as const;
