/**
 * SINGLETON PERMISSION REGISTRY
 *
 * Single source of truth for all permission strings.
 *
 * To add a new module:
 *   1. Add resource entry to PERMISSION_REGISTRY
 *   2. Use in controller: @Permissions(PERMISSION_REGISTRY.library.view)
 *   3. Seeder picks up ALL_PERMISSIONS automatically — no other change needed
 *
 * Roles are created entirely via the UI (POST /roles + POST /roles/:id/permissions).
 * No default role seeding happens — admins configure roles manually.
 */

export const PERMISSION_REGISTRY = {
  students: {
    view: 'students.view',
    create: 'students.create',
    update: 'students.update',
    delete: 'students.delete',
  },
  staff: {
    view: 'staff.view',
    create: 'staff.create',
    update: 'staff.update',
    delete: 'staff.delete',
    offboard: 'staff.offboard',
  },
  parents: { view: 'parents.view', create: 'parents.create', update: 'parents.update' },
  fees: {
    view: 'fees.view',
    create: 'fees.create',
    update: 'fees.update',
    approve: 'fees.approve',
  },
  exams: {
    view: 'exams.view',
    create: 'exams.create',
    update: 'exams.update',
    delete: 'exams.delete',
  },
  attendance: { view: 'attendance.view', create: 'attendance.create', update: 'attendance.update' },
  leave: { view: 'leave.view', approve: 'leave.approve', reject: 'leave.reject' },
  departments: {
    view: 'departments.view',
    create: 'departments.create',
    update: 'departments.update',
    delete: 'departments.delete',
  },
  classes: {
    view: 'classes.view',
    create: 'classes.create',
    update: 'classes.update',
    delete: 'classes.delete',
  },
  subjects: {
    view: 'subjects.view',
    create: 'subjects.create',
    update: 'subjects.update',
    delete: 'subjects.delete',
  },
  timetable: {
    view: 'timetable.view',
    create: 'timetable.create',
    update: 'timetable.update',
    delete: 'timetable.delete',
  },
  syllabus: {
    view: 'syllabus.view',
    create: 'syllabus.create',
    update: 'syllabus.update',
    delete: 'syllabus.delete',
  },
  homework: {
    view: 'homework.view',
    create: 'homework.create',
    update: 'homework.update',
    delete: 'homework.delete',
  },
  admissions: {
    view: 'admissions.view',
    create: 'admissions.create',
    update: 'admissions.update',
    delete: 'admissions.delete',
  },
  reports: { view: 'reports.view', export: 'reports.export' },
  settings: { view: 'settings.view', update: 'settings.update' },
  roles: {
    view: 'roles.view',
    create: 'roles.create',
    update: 'roles.update',
    delete: 'roles.delete',
  },
  communications: {
    view: 'communications.view',
    create: 'communications.create',
    update: 'communications.update',
  },
  holidays: {
    view: 'holidays.view',
    create: 'holidays.create',
    update: 'holidays.update',
    delete: 'holidays.delete',
  },
  events: {
    view: 'events.view',
    create: 'events.create',
    update: 'events.update',
    delete: 'events.delete',
  },
  academic_years: {
    view: 'academic_years.view',
    create: 'academic_years.create',
    update: 'academic_years.update',
  },
  // ← ADD NEW MODULE HERE
} as const;

/** All permission slugs — seeder upserts these on startup */
export const ALL_PERMISSIONS: string[] = Object.values(PERMISSION_REGISTRY).flatMap((r) =>
  Object.values(r),
);

/** Strongly typed permission string */
export type AppPermission = {
  [K in keyof typeof PERMISSION_REGISTRY]: (typeof PERMISSION_REGISTRY)[K][keyof (typeof PERMISSION_REGISTRY)[K]];
}[keyof typeof PERMISSION_REGISTRY];
