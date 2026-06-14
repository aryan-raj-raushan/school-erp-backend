export const CacheTTL = {
  SHORT: 300, // attendance, dashboard (5 min)
  MEDIUM: 21600, // students-list, staff, subscriptions, fees, academics, exams, leave, comms, parents, sections (6 h)
  LONG: 21600, // student-item, classes, departments, schools, holidays, class-details, syllabi, subjects, class-types, academic-years (6 h)
  HOUR: 21600, // master-data, company-schools (6 h)
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
