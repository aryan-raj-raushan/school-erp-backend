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
 * Custom roles are created via the UI (POST /roles + POST /roles/:id/permissions).
 * The 7 predefined system roles (School Admin + 6 staff roles) are auto-seeded per
 * school on creation — see RolesService.seedSystemRoles(). School Admins can still
 * adjust their permissions afterward via POST /roles/:id/permissions.
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
    delete: 'fees.delete',
    approve: 'fees.approve',
  },
  exams: {
    view: 'exams.view',
    create: 'exams.create',
    update: 'exams.update',
    delete: 'exams.delete',
    publish: 'exams.publish',
    manageSchedule: 'exams.manageSchedule',
    manageSitting: 'exams.manageSitting',
  },
  attendance: { view: 'attendance.view', create: 'attendance.create', update: 'attendance.update' },
  leave: { view: 'leave.view', approve: 'leave.approve', reject: 'leave.reject' },
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
  classSubjectTeachers: {
    view: 'classSubjectTeachers.view',
    create: 'classSubjectTeachers.create',
    update: 'classSubjectTeachers.update',
    delete: 'classSubjectTeachers.delete',
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
  finance: {
    view: 'finance.view',
    create: 'finance.create',
    update: 'finance.update',
    delete: 'finance.delete',
  },
  salary: {
    view: 'salary.view',
    create: 'salary.create',
    update: 'salary.update',
    delete: 'salary.delete',
    process: 'salary.process',
  },
  schoolSettings: {
    view: 'schoolSettings.view',
    update: 'schoolSettings.update',
  },
  staffShifts: {
    view: 'staffShifts.view',
    create: 'staffShifts.create',
    update: 'staffShifts.update',
    delete: 'staffShifts.delete',
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
