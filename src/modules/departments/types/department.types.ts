import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { departments } from '../../../database/drizzle/schema/departments.schema';

export type Department = InferSelectModel<typeof departments>;
export type NewDepartment = InferInsertModel<typeof departments>;
