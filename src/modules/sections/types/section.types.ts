import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { sections } from '../../../database/drizzle/schema/sections.schema';

export type Section = InferSelectModel<typeof sections>;
export type NewSection = InferInsertModel<typeof sections>;
