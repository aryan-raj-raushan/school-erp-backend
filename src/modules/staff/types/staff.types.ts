import { InferSelectModel } from 'drizzle-orm';
import { schoolUsers } from '../../../database/drizzle/schema/school-users.schema';

export type StaffMember = InferSelectModel<typeof schoolUsers>;
