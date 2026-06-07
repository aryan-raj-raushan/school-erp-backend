import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { syllabi, syllabusAttachments } from '../../../database/drizzle/schema/syllabi.schema';

export type Syllabus = InferSelectModel<typeof syllabi>;
export type NewSyllabus = InferInsertModel<typeof syllabi>;
export type SyllabusAttachment = InferSelectModel<typeof syllabusAttachments>;
export type NewSyllabusAttachment = InferInsertModel<typeof syllabusAttachments>;

export interface SyllabusWithAttachments extends Syllabus {
  attachments: SyllabusAttachment[];
}
