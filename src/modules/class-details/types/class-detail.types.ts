import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { classDetails } from '../../../database/drizzle/schema/class-details.schema';

export type ClassDetail = InferSelectModel<typeof classDetails>;
export type NewClassDetail = InferInsertModel<typeof classDetails>;
