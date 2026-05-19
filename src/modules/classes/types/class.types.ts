import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { classes } from '../../../database/drizzle/schema/classes.schema';

export type Class = InferSelectModel<typeof classes>;
export type NewClass = InferInsertModel<typeof classes>;
