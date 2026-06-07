export const TimetableSessionType = {
  SUMMER: 'summer',
  WINTER: 'winter',
  SPRING: 'spring',
  AUTUMN: 'autumn',
  ANNUAL: 'annual',
  QUARTERLY: 'quarterly',
} as const;

export type TimetableSessionType = (typeof TimetableSessionType)[keyof typeof TimetableSessionType];
