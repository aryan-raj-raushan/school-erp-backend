export const REDIS_ADMISSION_KEY = {
  LIST_TTL: 60,
  ITEM_TTL: 180,
  HISTORY_TTL: 120,
  ADMISSION_ENQUIRY: (schoolId: string) => `admission_enquiries:${schoolId}`,
};

export const REDIS_ADMISSION_SOURCE_KEY = {
  LIST_TTL: 120,
  ITEM_TTL: 300,
  ADMISSION_SOURCE: (schoolId: string) => `admission_sources:${schoolId}`,
};

export const REDI_HOLIDAY_EVENTS_KEY = {
  LIST_TTL: 120,
  ITEM_TTL: 300,
  SCHOOL_EVENTS:(schoolId:string)=> `school_events:${schoolId}`,
};
