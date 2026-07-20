export enum CompanyRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  SUPPORT = 'SUPPORT',
  SALES = 'SALES',
  OPERATOR = 'OPERATOR',
}

export enum SchoolRole {
  SCHOOL_ADMIN = 'SCHOOL_ADMIN',
  PRINCIPAL = 'PRINCIPAL',
  VICE_PRINCIPAL = 'VICE_PRINCIPAL',
  TEACHER = 'TEACHER',
  CLASS_TEACHER = 'CLASS_TEACHER',
  ACCOUNTANT = 'ACCOUNTANT',
  LIBRARIAN = 'LIBRARIAN',
  /** Staff whose actual designation is a school-defined custom role — see custom_role_id. */
  OTHER = 'OTHER',
}

export enum ParentRole {
  PARENT = 'PARENT',
}

export type AnyRole = CompanyRole | SchoolRole | ParentRole;

/** SchoolRole values that have an auto-seeded system role — excludes OTHER (custom-role-only staff). */
export type SystemSchoolRole = Exclude<SchoolRole, SchoolRole.OTHER>;

export enum AuthContext {
  COMPANY = 'COMPANY',
  SCHOOL = 'SCHOOL',
  PARENT = 'PARENT',
}

export const ADMIN_ROLES = [SchoolRole.SCHOOL_ADMIN, SchoolRole.PRINCIPAL];

export const ALL_SCHOOL_ROLES: SystemSchoolRole[] = [
  SchoolRole.SCHOOL_ADMIN,
  SchoolRole.PRINCIPAL,
  SchoolRole.VICE_PRINCIPAL,
  SchoolRole.TEACHER,
  SchoolRole.CLASS_TEACHER,
  SchoolRole.ACCOUNTANT,
  SchoolRole.LIBRARIAN,
];

// VIEW_ROLES = all school staff — fine-grained access via @Permissions() on each route
export const VIEW_ROLES = ALL_SCHOOL_ROLES;
