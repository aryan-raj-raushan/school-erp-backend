import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { classTypes } from '../../../database/drizzle/schema/class-types.schema';

export type ClassType = InferSelectModel<typeof classTypes>;
export type NewClassType = InferInsertModel<typeof classTypes>;
