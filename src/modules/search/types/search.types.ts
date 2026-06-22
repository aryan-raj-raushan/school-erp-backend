export type SearchResultType =
  | 'student'
  | 'staff'
  | 'parent'
  | 'admission'
  | 'class'
  | 'subject'
  | 'department'
  | 'fee_type'
  | 'event'
  | 'academic_year'
  | 'homework';

export interface SearchResultItem {
  id: string;
  type: SearchResultType;
  name: string;
  subtitle: string;
  meta?: string;
}

export interface GlobalSearchResult {
  students: SearchResultItem[];
  staff: SearchResultItem[];
  parents: SearchResultItem[];
  admissions: SearchResultItem[];
  classes: SearchResultItem[];
  subjects: SearchResultItem[];
  departments: SearchResultItem[];
  feeTypes: SearchResultItem[];
  events: SearchResultItem[];
  academicYears: SearchResultItem[];
  homework: SearchResultItem[];
  query: string;
}
