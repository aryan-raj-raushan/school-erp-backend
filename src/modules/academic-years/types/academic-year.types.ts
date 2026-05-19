import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { academicYears } from '../../../database/drizzle/schema/academic-years.schema';

export type AcademicYear = InferSelectModel<typeof academicYears>;
export type NewAcademicYear = InferInsertModel<typeof academicYears>;
