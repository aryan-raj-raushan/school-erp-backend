import { InferSelectModel } from 'drizzle-orm';
import { schoolUsers } from '../../../database/drizzle/schema/school-users.schema';

export type StaffMember = InferSelectModel<typeof schoolUsers>;

export type BulkJobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface BulkJobResult {
  jobId: string;
  status: BulkJobStatus;
  total?: number;
  created?: number;
  failed?: number;
  errors?: string[];
  completedAt?: string;
}
