import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { admissionSources } from '../../../database/drizzle/schema/admission-sources.schema';

export type AdmissionSource = InferSelectModel<typeof admissionSources>;
export type NewAdmissionSource = InferInsertModel<typeof admissionSources>;