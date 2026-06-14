import { bonafideCertificates, transferCertificates } from '@database/drizzle/schema/certificates.schema';
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';


// ─── Transfer Certificate ─────────────────────────────────────────────────────

export type TransferCertificate = InferSelectModel<typeof transferCertificates>;
export type NewTransferCertificate = InferInsertModel<typeof transferCertificates>;

export interface TransferCertificateListRow {
  id: string;
  reference_no: string;
  leaving_reason: string;
  status: string;
  pdf_url: string | null;
  created_at: Date;
  student_name: string;
  class_name: string | null;
  section_name: string | null;
  academic_year_name: string | null;
}

export interface TransferCertificateDetailRow extends TransferCertificate {
  student: {
    id: string;
    first_name: string;
    last_name: string | null;
    date_of_birth: string | null;
    aadhaar_number: string | null;
    profile_image: string | null;
  };
  class: { id: string; name: string } | null;
  section: { id: string; name: string } | null;
  academic_year: { id: string; name: string } | null;
  parents: Array<{
    id: string;
    relation: string;
    first_name: string;
    last_name: string | null;
    phone_number: string;
    is_primary: boolean;
  }>;
}

// ─── Bonafide Certificate ─────────────────────────────────────────────────────

export type BonafideCertificate = InferSelectModel<typeof bonafideCertificates>;
export type NewBonafideCertificate = InferInsertModel<typeof bonafideCertificates>;

export interface BonafideCertificateListRow {
  id: string;
  reference_no: string;
  purpose: string;
  status: string;
  pdf_url: string | null;
  created_at: Date;
  student_name: string;
  class_name: string | null;
  section_name: string | null;
  academic_year_name: string | null;
}

export interface BonafideCertificateDetailRow extends BonafideCertificate {
  student: {
    id: string;
    first_name: string;
    last_name: string | null;
    date_of_birth: string | null;
    aadhaar_number: string | null;
    profile_image: string | null;
  };
  class: { id: string; name: string } | null;
  section: { id: string; name: string } | null;
  academic_year: { id: string; name: string } | null;
  parents: Array<{
    id: string;
    relation: string;
    first_name: string;
    last_name: string | null;
    phone_number: string;
    is_primary: boolean;
  }>;
}

// ─── Shared ───────────────────────────────────────────────────────────────────

export interface CertificateCountResult {
  count: number;
}

export interface PdfUploadResult {
  url: string;
  s3Key: string;
}