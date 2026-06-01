import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { holidays } from '../../../database/drizzle/schema/holidays.schema';

export type Holiday = InferSelectModel<typeof holidays>;
export type NewHoliday = InferInsertModel<typeof holidays>;
