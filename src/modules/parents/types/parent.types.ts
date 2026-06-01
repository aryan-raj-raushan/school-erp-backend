import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { parents } from '../../../database/drizzle/schema/parents.schema';

export type Parent = InferSelectModel<typeof parents>;
export type NewParent = InferInsertModel<typeof parents>;

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
