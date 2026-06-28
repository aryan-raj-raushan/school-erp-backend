import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import {
  schoolSettings,
  schoolTimings,
  classTimingOverrides,
} from '../../../database/drizzle/schema/school-settings.schema';

export type SchoolSettings = InferSelectModel<typeof schoolSettings>;
export type NewSchoolSettings = InferInsertModel<typeof schoolSettings>;

export type SchoolTiming = InferSelectModel<typeof schoolTimings>;
export type NewSchoolTiming = InferInsertModel<typeof schoolTimings>;

export type ClassTimingOverride = InferSelectModel<typeof classTimingOverrides>;
export type NewClassTimingOverride = InferInsertModel<typeof classTimingOverrides>;
