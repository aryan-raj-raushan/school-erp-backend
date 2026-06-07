import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { schoolEvents } from '../../../database/drizzle/schema/school-events.schema';

export type SchoolEvent = InferSelectModel<typeof schoolEvents>;
export type NewSchoolEvent = InferInsertModel<typeof schoolEvents>;