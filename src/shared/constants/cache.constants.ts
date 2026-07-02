// These are staleness windows (seconds), not Redis TTLs — keys never expire in Redis.
// Background refresh fires when age > this value. Explicit delByPattern on mutations.
export const CacheTTL = {
  SHORT: 300, // attendance, dashboard — 5 min
  MEDIUM: 86400, // students, staff, fees, academics — 24h
  LONG: 604800, // classes, schools, subjects — 7 days
  HOUR: 86400, // master-data, company-schools — 24h
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
