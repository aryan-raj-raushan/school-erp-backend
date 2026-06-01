import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import {
  exams,
  examPolicies,
  examTimetable,
  examStudents,
  examRooms,
  examSeating,
  admitCards,
  examMarks,
  teacherRemarks,
} from '../../../database/drizzle/schema/exams.schema';

export type Exam = InferSelectModel<typeof exams>;
export type NewExam = InferInsertModel<typeof exams>;

export type ExamPolicy = InferSelectModel<typeof examPolicies>;
export type NewExamPolicy = InferInsertModel<typeof examPolicies>;

export type ExamTimetableEntry = InferSelectModel<typeof examTimetable>;
export type NewExamTimetableEntry = InferInsertModel<typeof examTimetable>;

export type ExamStudent = InferSelectModel<typeof examStudents>;
export type NewExamStudent = InferInsertModel<typeof examStudents>;

export type ExamRoom = InferSelectModel<typeof examRooms>;
export type NewExamRoom = InferInsertModel<typeof examRooms>;

export type ExamSeat = InferSelectModel<typeof examSeating>;
export type NewExamSeat = InferInsertModel<typeof examSeating>;

export type AdmitCard = InferSelectModel<typeof admitCards>;
export type NewAdmitCard = InferInsertModel<typeof admitCards>;

export type ExamMark = InferSelectModel<typeof examMarks>;
export type NewExamMark = InferInsertModel<typeof examMarks>;

export type TeacherRemark = InferSelectModel<typeof teacherRemarks>;
export type NewTeacherRemark = InferInsertModel<typeof teacherRemarks>;
