/**
 * Central registry of app-wide domain event names, shared by every module
 * via the global EventsModule (src/modules/events/events.module.ts).
 * Add a new section here whenever a module needs to emit/listen for events —
 * keeps event names discoverable in one place instead of scattered string literals.
 */
export const APP_EVENTS = {
  EXAM: {
    DELETED: 'exam.deleted',
  },
  SITTING_PLAN: {
    ROOMS_ASSIGNED: 'sitting-plan.rooms-assigned',
  },
} as const;
