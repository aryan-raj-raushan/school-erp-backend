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
