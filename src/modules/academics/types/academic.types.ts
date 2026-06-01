import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { homeworks, homeworkSubmissions, studyMaterials } from '../../../database/drizzle/schema/academics.schema';

export type Homework = InferSelectModel<typeof homeworks>;
export type NewHomework = InferInsertModel<typeof homeworks>;

export type HomeworkSubmission = InferSelectModel<typeof homeworkSubmissions>;
export type NewHomeworkSubmission = InferInsertModel<typeof homeworkSubmissions>;

export type StudyMaterial = InferSelectModel<typeof studyMaterials>;
export type NewStudyMaterial = InferInsertModel<typeof studyMaterials>;
