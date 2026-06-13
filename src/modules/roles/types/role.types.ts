import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { roles } from '../../../database/drizzle/schema/roles.schema';

export type Role = InferSelectModel<typeof roles>;
export type NewRole = InferInsertModel<typeof roles>;
