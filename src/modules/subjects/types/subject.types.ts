import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { subjects } from '../../../database/drizzle/schema/subjects.schema';

export type Subject = InferSelectModel<typeof subjects>;
export type NewSubject = InferInsertModel<typeof subjects>;
