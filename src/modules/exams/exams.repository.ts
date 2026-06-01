import { Injectable, Inject } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import {
  exams, examPolicies, examTimetable, examStudents,
  examRooms, examSeating, admitCards, examMarks, teacherRemarks,
} from '../../database/drizzle/schema/exams.schema';
import {
  Exam, NewExam, ExamPolicy, NewExamPolicy, ExamTimetableEntry, NewExamTimetableEntry,
  ExamStudent, NewExamStudent, ExamRoom, NewExamRoom, ExamSeat, NewExamSeat,
  AdmitCard, NewAdmitCard, ExamMark, NewExamMark, TeacherRemark, NewTeacherRemark,
} from './types/exam.types';

@Injectable()
export class ExamsRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  // Exams
  async findAllExams(schoolId: string, academicYearId?: string): Promise<Exam[]> {
    const conditions = [eq(exams.school_id, schoolId), eq(exams.deleted, false)];
    if (academicYearId) conditions.push(eq(exams.academic_year_id, academicYearId));
    return this.db.select().from(exams).where(and(...conditions)).orderBy(exams.start_date);
  }

  async findExamById(id: string, schoolId: string): Promise<Exam | undefined> {
    const [row] = await this.db.select().from(exams).where(and(eq(exams.id, id), eq(exams.school_id, schoolId), eq(exams.deleted, false)));
    return row;
  }

  async createExam(data: NewExam): Promise<Exam> {
    const [row] = await this.db.insert(exams).values(data).returning();
    return row;
  }

  async updateExam(id: string, schoolId: string, data: Partial<NewExam>): Promise<Exam> {
    const [row] = await this.db.update(exams).set({ ...data, updated_at: new Date() }).where(and(eq(exams.id, id), eq(exams.school_id, schoolId))).returning();
    return row;
  }

  async deleteExam(id: string, schoolId: string): Promise<void> {
    await this.db.update(exams).set({ deleted: true, is_active: false, updated_at: new Date() }).where(and(eq(exams.id, id), eq(exams.school_id, schoolId)));
  }

  // Exam Policies
  async findAllPolicies(schoolId: string, examId?: string): Promise<ExamPolicy[]> {
    const conditions = [eq(examPolicies.school_id, schoolId), eq(examPolicies.deleted, false)];
    if (examId) conditions.push(eq(examPolicies.exam_id, examId));
    return this.db.select().from(examPolicies).where(and(...conditions));
  }

  async findPolicyById(id: string, schoolId: string): Promise<ExamPolicy | undefined> {
    const [row] = await this.db.select().from(examPolicies).where(and(eq(examPolicies.id, id), eq(examPolicies.school_id, schoolId), eq(examPolicies.deleted, false)));
    return row;
  }

  async createPolicy(data: NewExamPolicy): Promise<ExamPolicy> {
    const [row] = await this.db.insert(examPolicies).values(data).returning();
    return row;
  }

  async updatePolicy(id: string, schoolId: string, data: Partial<NewExamPolicy>): Promise<ExamPolicy> {
    const [row] = await this.db.update(examPolicies).set({ ...data, updated_at: new Date() }).where(and(eq(examPolicies.id, id), eq(examPolicies.school_id, schoolId))).returning();
    return row;
  }

  async deletePolicy(id: string, schoolId: string): Promise<void> {
    await this.db.update(examPolicies).set({ deleted: true, updated_at: new Date() }).where(and(eq(examPolicies.id, id), eq(examPolicies.school_id, schoolId)));
  }

  // Exam Timetable
  async findTimetableByExam(examId: string, schoolId: string): Promise<ExamTimetableEntry[]> {
    return this.db.select().from(examTimetable).where(and(eq(examTimetable.exam_id, examId), eq(examTimetable.school_id, schoolId), eq(examTimetable.deleted, false))).orderBy(examTimetable.date);
  }

  async findTimetableById(id: string, schoolId: string): Promise<ExamTimetableEntry | undefined> {
    const [row] = await this.db.select().from(examTimetable).where(and(eq(examTimetable.id, id), eq(examTimetable.school_id, schoolId)));
    return row;
  }

  async createTimetable(data: NewExamTimetableEntry): Promise<ExamTimetableEntry> {
    const [row] = await this.db.insert(examTimetable).values(data).returning();
    return row;
  }

  async updateTimetable(id: string, schoolId: string, data: Partial<NewExamTimetableEntry>): Promise<ExamTimetableEntry> {
    const [row] = await this.db.update(examTimetable).set({ ...data, updated_at: new Date() }).where(and(eq(examTimetable.id, id), eq(examTimetable.school_id, schoolId))).returning();
    return row;
  }

  async deleteTimetable(id: string, schoolId: string): Promise<void> {
    await this.db.update(examTimetable).set({ deleted: true, updated_at: new Date() }).where(and(eq(examTimetable.id, id), eq(examTimetable.school_id, schoolId)));
  }

  // Exam Students
  async findExamStudents(examId: string, schoolId: string): Promise<ExamStudent[]> {
    return this.db.select().from(examStudents).where(and(eq(examStudents.exam_id, examId), eq(examStudents.school_id, schoolId)));
  }

  async registerStudents(entries: NewExamStudent[]): Promise<ExamStudent[]> {
    return this.db.insert(examStudents).values(entries).returning();
  }

  async updateStudentEligibility(examId: string, studentId: string, schoolId: string, isEligible: boolean): Promise<ExamStudent> {
    const [row] = await this.db.update(examStudents).set({ is_eligible: isEligible, updated_at: new Date() }).where(and(eq(examStudents.exam_id, examId), eq(examStudents.student_id, studentId), eq(examStudents.school_id, schoolId))).returning();
    return row;
  }

  async removeExamStudent(id: string, schoolId: string): Promise<void> {
    await this.db.delete(examStudents).where(and(eq(examStudents.id, id), eq(examStudents.school_id, schoolId)));
  }

  // Exam Rooms
  async findRoomsByExam(examId: string, schoolId: string): Promise<ExamRoom[]> {
    return this.db.select().from(examRooms).where(and(eq(examRooms.exam_id, examId), eq(examRooms.school_id, schoolId), eq(examRooms.deleted, false)));
  }

  async findRoomById(id: string, schoolId: string): Promise<ExamRoom | undefined> {
    const [row] = await this.db.select().from(examRooms).where(and(eq(examRooms.id, id), eq(examRooms.school_id, schoolId)));
    return row;
  }

  async createRoom(data: NewExamRoom): Promise<ExamRoom> {
    const [row] = await this.db.insert(examRooms).values(data).returning();
    return row;
  }

  async updateRoom(id: string, schoolId: string, data: Partial<NewExamRoom>): Promise<ExamRoom> {
    const [row] = await this.db.update(examRooms).set({ ...data, updated_at: new Date() }).where(and(eq(examRooms.id, id), eq(examRooms.school_id, schoolId))).returning();
    return row;
  }

  async deleteRoom(id: string, schoolId: string): Promise<void> {
    await this.db.update(examRooms).set({ deleted: true, updated_at: new Date() }).where(and(eq(examRooms.id, id), eq(examRooms.school_id, schoolId)));
  }

  // Exam Seating
  async findSeatingByExam(examId: string, schoolId: string, date?: string): Promise<ExamSeat[]> {
    const conditions = [eq(examSeating.exam_id, examId), eq(examSeating.school_id, schoolId)];
    if (date) conditions.push(eq(examSeating.date, date));
    return this.db.select().from(examSeating).where(and(...conditions));
  }

  async assignSeat(data: NewExamSeat): Promise<ExamSeat> {
    const [row] = await this.db.insert(examSeating).values(data).returning();
    return row;
  }

  async removeSeat(id: string, schoolId: string): Promise<void> {
    await this.db.delete(examSeating).where(and(eq(examSeating.id, id), eq(examSeating.school_id, schoolId)));
  }

  // Admit Cards
  async findAdmitCardByStudent(examId: string, studentId: string, schoolId: string): Promise<AdmitCard | undefined> {
    const [row] = await this.db.select().from(admitCards).where(and(eq(admitCards.exam_id, examId), eq(admitCards.student_id, studentId), eq(admitCards.school_id, schoolId)));
    return row;
  }

  async findAdmitCardsByClass(examId: string, classSectionId: string, schoolId: string): Promise<AdmitCard[]> {
    return this.db
      .select({ admitCards })
      .from(admitCards)
      .innerJoin(examStudents, eq(admitCards.student_id, examStudents.student_id))
      .where(and(eq(admitCards.exam_id, examId), eq(admitCards.school_id, schoolId)))
      .then((rows) => rows.map((r) => r.admitCards));
  }

  async createAdmitCard(data: NewAdmitCard): Promise<AdmitCard> {
    const [row] = await this.db.insert(admitCards).values(data).returning();
    return row;
  }

  async countAdmitCards(examId: string, schoolId: string): Promise<number> {
    const [{ count }] = await this.db.select({ count: sql<number>`count(*)` }).from(admitCards).where(and(eq(admitCards.exam_id, examId), eq(admitCards.school_id, schoolId)));
    return Number(count);
  }

  // Exam Marks
  async findMarksByExam(examId: string, schoolId: string, classSectionId?: string, subjectId?: string): Promise<ExamMark[]> {
    const conditions = [eq(examMarks.exam_id, examId), eq(examMarks.school_id, schoolId)];
    if (classSectionId) conditions.push(eq(examMarks.class_section_id, classSectionId));
    if (subjectId) conditions.push(eq(examMarks.subject_id, subjectId));
    return this.db.select().from(examMarks).where(and(...conditions));
  }

  async upsertMark(data: NewExamMark): Promise<ExamMark> {
    const [row] = await this.db.insert(examMarks).values(data)
      .onConflictDoUpdate({
        target: [examMarks.exam_id, examMarks.student_id, examMarks.subject_id],
        set: { marks_obtained: data.marks_obtained, is_absent: data.is_absent, grade: data.grade, updated_at: new Date() },
      }).returning();
    return row;
  }

  // Teacher Remarks
  async findRemarks(schoolId: string, examId?: string, studentId?: string): Promise<TeacherRemark[]> {
    const conditions = [eq(teacherRemarks.school_id, schoolId)];
    if (examId) conditions.push(eq(teacherRemarks.exam_id, examId));
    if (studentId) conditions.push(eq(teacherRemarks.student_id, studentId));
    return this.db.select().from(teacherRemarks).where(and(...conditions));
  }

  async createRemark(data: NewTeacherRemark): Promise<TeacherRemark> {
    const [row] = await this.db.insert(teacherRemarks).values(data).returning();
    return row;
  }

  // Mark Sheet
  async getMarkSheetForStudent(studentId: string, examId: string, schoolId: string): Promise<ExamMark[]> {
    return this.db.select().from(examMarks).where(and(eq(examMarks.student_id, studentId), eq(examMarks.exam_id, examId), eq(examMarks.school_id, schoolId)));
  }

  async getMarkSheetForClass(classSectionId: string, examId: string, schoolId: string): Promise<ExamMark[]> {
    return this.db.select().from(examMarks).where(and(eq(examMarks.class_section_id, classSectionId), eq(examMarks.exam_id, examId), eq(examMarks.school_id, schoolId)));
  }

  async getAnnualMarksForStudent(studentId: string, schoolId: string, academicYearId: string): Promise<ExamMark[]> {
    return this.db.select({ examMarks }).from(examMarks)
      .innerJoin(exams, eq(examMarks.exam_id, exams.id))
      .where(and(eq(examMarks.student_id, studentId), eq(examMarks.school_id, schoolId), eq(exams.academic_year_id, academicYearId)))
      .then((rows) => rows.map((r) => r.examMarks));
  }

  async getAnnualMarksForClass(classSectionId: string, schoolId: string, academicYearId: string): Promise<ExamMark[]> {
    return this.db.select({ examMarks }).from(examMarks)
      .innerJoin(exams, eq(examMarks.exam_id, exams.id))
      .where(and(eq(examMarks.class_section_id, classSectionId), eq(examMarks.school_id, schoolId), eq(exams.academic_year_id, academicYearId)))
      .then((rows) => rows.map((r) => r.examMarks));
  }
}
