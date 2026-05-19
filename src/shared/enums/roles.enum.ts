export enum CompanyRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  SUPPORT = 'SUPPORT',
  SALES = 'SALES',
}

export enum SchoolRole {
  SCHOOL_ADMIN = 'SCHOOL_ADMIN',
  PRINCIPAL = 'PRINCIPAL',
  VICE_PRINCIPAL = 'VICE_PRINCIPAL',
  TEACHER = 'TEACHER',
  CLASS_TEACHER = 'CLASS_TEACHER',
  ACCOUNTANT = 'ACCOUNTANT',
  LIBRARIAN = 'LIBRARIAN',
}

export type AnyRole = CompanyRole | SchoolRole;

export enum AuthContext {
  COMPANY = 'COMPANY',
  SCHOOL = 'SCHOOL',
}
