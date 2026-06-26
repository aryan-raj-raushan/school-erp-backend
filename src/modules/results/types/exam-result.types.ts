import { examResults, reportCards } from '@database/drizzle/schema';
import { InferInsertModel, InferSelectModel } from 'drizzle-orm';

// ─── Exam Result ─────────────────────────────────────────────────────────────

export type ExamResult = InferSelectModel<typeof examResults>;
export type NewExamResult = InferInsertModel<typeof examResults>;

export interface BulkUpsertResultItem {
  student_id: string;
  exam_schedule_id: string;
  subject_id: string;
  marks_obtained: number | null;
  is_absent?: boolean;
}

export interface ExamResultWithStudent {
  id: string;
  student_id: string;
  student_name: string;
  roll_number: string | null;
  subject_id: string;
  subject_name: string;
  subject_type: string;
  exam_schedule_id: string;
  marks_obtained: string | null;
  max_marks: number;
  is_absent: boolean;
  is_published: boolean;
}

export interface SubjectResultRow {
  subject_id: string;
  subject_name: string;
  subject_type: string;
  exam_schedule_id: string;
  max_marks: number;
  marks_obtained: string | null;
  is_absent: boolean;
  grade: string | null;
}

export interface StudentResultSummary {
  student_id: string;
  student_name: string;
  roll_number: string | null;
  admission_number: string;
  subjects: SubjectResultRow[];
  total_marks: number;
  marks_obtained: number;
  percentage: number;
  grade: string | null;
  rank?: number;
}

// ─── Report Card ─────────────────────────────────────────────────────────────

export type ReportCard = InferSelectModel<typeof reportCards>;
export type NewReportCard = InferInsertModel<typeof reportCards>;

export interface ReportCardListRow {
  id: string;
  student_id: string;
  student_name: string;
  roll_number: string | null;
  class_name: string | null;
  section_name: string | null;
  academic_year_name: string | null;
  exam_name: string | null;
  exam_term: string | null;
  total_marks: number | null;
  marks_obtained: string | null;
  percentage: string | null;
  grade: string | null;
  rank: number | null;
  status: string;
  is_published: boolean;
  pdf_url: string | null;
  created_at: Date;
}

// ─── PDF Generation data shapes ───────────────────────────────────────────────

export interface ReportCardPdfData {
  school: {
    name: string;
    tagline?: string;
    address?: string;
    contact_number?: string;
    logo_url?: string;
  };
  student: {
    name: string;
    father_name: string;
    mother_name: string;
    date_of_birth: string;
    roll_number: string;
    registration_number: string;
    admission_number: string;
    section: string;
    profile_image?: string;
  };
  class_name: string;
  academic_year: string;
  exam_name: string;
  exam_term: string;
  subjects: {
    name: string;
    subject_type: string;
    theory_total: number;
    theory_scored: number | null;
    oral_total: number;
    oral_scored: number | null;
    all_total: number;
    total_scored: number | null;
    grade: string;
    is_absent: boolean;
  }[];
  grand_total_marks: number;
  grand_total_scored: number;
  grand_percentage: string;
  grand_grade: string;
  rank: number;
  remarks: string;
  co_scholastic: { subject: string; term_detail: string }[];
  grading_scale: string;
  issue_date: string;
}
