import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { admissionEnquiries } from '../../../database/drizzle/schema/admission-enquiries.schema';
import { enquiryHistory } from '../../../database/drizzle/schema/enquiry-history.schema';

export type AdmissionEnquiry = InferSelectModel<typeof admissionEnquiries>;
export type NewAdmissionEnquiry = InferInsertModel<typeof admissionEnquiries>;

export type EnquiryHistory = InferSelectModel<typeof enquiryHistory>;
export type NewEnquiryHistory = InferInsertModel<typeof enquiryHistory>;