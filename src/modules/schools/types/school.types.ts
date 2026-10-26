import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { schools } from '../../../database/drizzle/schema/schools.schema';

export type School = InferSelectModel<typeof schools>;
export type NewSchool = InferInsertModel<typeof schools>;

export interface SchoolAdminCredentials {
  login_id: string;
  temporary_password: string;
}

export type SchoolWithCredentials = School & { admin_credentials?: SchoolAdminCredentials };

export interface SchoolListItem extends Pick<
  School,
  'id' | 'name' | 'code' | 'city' | 'state' | 'board_type' | 'is_active'
> {
  admin_count?: number;
}
