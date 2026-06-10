import { Injectable, NotFoundException } from '@nestjs/common';
import { ExamsRepository } from './exams.repository';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { CreateExamDto } from './dto/create-exam.dto';
import { CreateExamPolicyDto } from './dto/create-exam-policy.dto';
import { CreateExamTimetableDto } from './dto/create-exam-timetable.dto';
import { CreateExamRoomDto } from './dto/create-exam-room.dto';
import { AssignSeatDto, AutoGenerateSeatingDto } from './dto/assign-seat.dto';
import { BulkExamMarksDto, TeacherRemarkDto } from './dto/exam-marks.dto';
import {
  Exam,
  ExamPolicy,
  ExamTimetableEntry,
  ExamStudent,
  ExamRoom,
  ExamSeat,
  AdmitCard,
  ExamMark,
  TeacherRemark,
} from './types/exam.types';
import { CacheTTL } from '../../shared/constants';

@Injectable()
export class ExamsService {
  constructor(
    private readonly examsRepo: ExamsRepository,
    private readonly redisService: RedisService,
  ) {}

  private cacheKey(schoolId: string) {
    return `exams:${schoolId}`;
  }

  // Exams
  async findAllExams(schoolId: string, academicYearId?: string): Promise<Exam[]> {
    return this.redisService.getOrSet(
      `${this.cacheKey(schoolId)}:list:${academicYearId}`,
      CacheTTL.MEDIUM,
      () => this.examsRepo.findAllExams(schoolId, academicYearId),
    );
  }

  async findExamById(id: string, schoolId: string): Promise<Exam> {
    const exam = await this.examsRepo.findExamById(id, schoolId);
    if (!exam) throw new NotFoundException(`Exam with id '${id}' not found`);
    return exam;
  }

  async createExam(dto: CreateExamDto, schoolId: string, createdBy: string): Promise<Exam> {
    const exam = await this.examsRepo.createExam({
      id: generateId(),
      school_id: schoolId,
      created_by: createdBy,
      ...dto,
    });
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return exam;
  }

  async updateExam(id: string, schoolId: string, dto: Partial<CreateExamDto>): Promise<Exam> {
    await this.findExamById(id, schoolId);
    const updated = await this.examsRepo.updateExam(id, schoolId, dto);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return updated;
  }

  async deleteExam(id: string, schoolId: string): Promise<void> {
    await this.findExamById(id, schoolId);
    await this.examsRepo.deleteExam(id, schoolId);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
  }

  // Policies
  async findAllPolicies(schoolId: string, examId?: string): Promise<ExamPolicy[]> {
    return this.examsRepo.findAllPolicies(schoolId, examId);
  }

  async findPolicyById(id: string, schoolId: string): Promise<ExamPolicy> {
    const policy = await this.examsRepo.findPolicyById(id, schoolId);
    if (!policy) throw new NotFoundException(`Exam policy with id '${id}' not found`);
    return policy;
  }

  async createPolicy(dto: CreateExamPolicyDto, schoolId: string): Promise<ExamPolicy> {
    return this.examsRepo.createPolicy({
      id: generateId(),
      school_id: schoolId,
      ...dto,
      passing_marks: dto.passing_marks?.toString(),
      total_marks: dto.total_marks?.toString(),
      marking_system: dto.marking_system as 'MARKS' | 'GRADES' | 'PERCENTAGE' | undefined,
    });
  }

  async updatePolicy(
    id: string,
    schoolId: string,
    dto: Partial<CreateExamPolicyDto>,
  ): Promise<ExamPolicy> {
    await this.findPolicyById(id, schoolId);
    return this.examsRepo.updatePolicy(id, schoolId, {
      ...dto,
      passing_marks: dto.passing_marks?.toString(),
      total_marks: dto.total_marks?.toString(),
      marking_system: dto.marking_system as 'MARKS' | 'GRADES' | 'PERCENTAGE' | undefined,
    });
  }

  async deletePolicy(id: string, schoolId: string): Promise<void> {
    await this.findPolicyById(id, schoolId);
    await this.examsRepo.deletePolicy(id, schoolId);
  }

  // Timetable
  async findTimetableByExam(examId: string, schoolId: string): Promise<ExamTimetableEntry[]> {
    return this.examsRepo.findTimetableByExam(examId, schoolId);
  }

  async findTimetableById(id: string, schoolId: string): Promise<ExamTimetableEntry> {
    const entry = await this.examsRepo.findTimetableById(id, schoolId);
    if (!entry) throw new NotFoundException(`Timetable entry with id '${id}' not found`);
    return entry;
  }

  async createTimetable(
    dto: CreateExamTimetableDto,
    schoolId: string,
  ): Promise<ExamTimetableEntry> {
    return this.examsRepo.createTimetable({ id: generateId(), school_id: schoolId, ...dto });
  }

  async updateTimetable(
    id: string,
    schoolId: string,
    dto: Partial<CreateExamTimetableDto>,
  ): Promise<ExamTimetableEntry> {
    await this.findTimetableById(id, schoolId);
    return this.examsRepo.updateTimetable(id, schoolId, dto);
  }

  async deleteTimetable(id: string, schoolId: string): Promise<void> {
    await this.findTimetableById(id, schoolId);
    await this.examsRepo.deleteTimetable(id, schoolId);
  }

  // Exam Students
  async findExamStudents(examId: string, schoolId: string): Promise<ExamStudent[]> {
    return this.examsRepo.findExamStudents(examId, schoolId);
  }

  async registerStudents(
    examId: string,
    studentIds: string[],
    schoolId: string,
  ): Promise<ExamStudent[]> {
    await this.findExamById(examId, schoolId);
    const entries = studentIds.map((studentId, i) => ({
      id: generateId(),
      school_id: schoolId,
      exam_id: examId,
      student_id: studentId,
      roll_number: String(i + 1).padStart(4, '0'),
    }));
    return this.examsRepo.registerStudents(entries);
  }

  async updateStudentEligibility(
    examId: string,
    studentId: string,
    schoolId: string,
    isEligible: boolean,
  ): Promise<ExamStudent> {
    return this.examsRepo.updateStudentEligibility(examId, studentId, schoolId, isEligible);
  }

  async removeExamStudent(id: string, schoolId: string): Promise<void> {
    await this.examsRepo.removeExamStudent(id, schoolId);
  }

  // Exam Rooms
  async findRoomsByExam(examId: string, schoolId: string): Promise<ExamRoom[]> {
    return this.examsRepo.findRoomsByExam(examId, schoolId);
  }

  async findRoomById(id: string, schoolId: string): Promise<ExamRoom> {
    const room = await this.examsRepo.findRoomById(id, schoolId);
    if (!room) throw new NotFoundException(`Exam room with id '${id}' not found`);
    return room;
  }

  async createRoom(dto: CreateExamRoomDto, schoolId: string): Promise<ExamRoom> {
    return this.examsRepo.createRoom({ id: generateId(), school_id: schoolId, ...dto });
  }

  async updateRoom(
    id: string,
    schoolId: string,
    dto: Partial<CreateExamRoomDto>,
  ): Promise<ExamRoom> {
    await this.findRoomById(id, schoolId);
    return this.examsRepo.updateRoom(id, schoolId, dto);
  }

  async deleteRoom(id: string, schoolId: string): Promise<void> {
    await this.findRoomById(id, schoolId);
    await this.examsRepo.deleteRoom(id, schoolId);
  }

  // Seating
  async findSeating(examId: string, schoolId: string, date?: string): Promise<ExamSeat[]> {
    return this.examsRepo.findSeatingByExam(examId, schoolId, date);
  }

  async assignSeat(dto: AssignSeatDto, schoolId: string): Promise<ExamSeat> {
    return this.examsRepo.assignSeat({ id: generateId(), school_id: schoolId, ...dto });
  }

  async autoGenerateSeating(dto: AutoGenerateSeatingDto, schoolId: string): Promise<ExamSeat[]> {
    const students = await this.examsRepo.findExamStudents(dto.exam_id, schoolId);
    const rooms = await this.examsRepo.findRoomsByExam(dto.exam_id, schoolId);
    if (!rooms.length) return [];

    const seats: ExamSeat[] = [];
    let roomIdx = 0,
      seatNum = 1;

    for (const student of students) {
      if (seatNum > Number(rooms[roomIdx].capacity)) {
        roomIdx++;
        seatNum = 1;
        if (roomIdx >= rooms.length) break;
      }
      const seat = await this.examsRepo.assignSeat({
        id: generateId(),
        school_id: schoolId,
        exam_id: dto.exam_id,
        exam_room_id: rooms[roomIdx].id,
        student_id: student.student_id,
        seat_number: `${rooms[roomIdx].room_name}-${String(seatNum).padStart(2, '0')}`,
        date: dto.date,
      });
      seats.push(seat);
      seatNum++;
    }
    return seats;
  }

  async removeSeat(id: string, schoolId: string): Promise<void> {
    await this.examsRepo.removeSeat(id, schoolId);
  }

  // Admit Cards
  async generateAdmitCard(examId: string, studentId: string, schoolId: string): Promise<AdmitCard> {
    const existing = await this.examsRepo.findAdmitCardByStudent(examId, studentId, schoolId);
    if (existing) return existing;

    const count = await this.examsRepo.countAdmitCards(examId, schoolId);
    return this.examsRepo.createAdmitCard({
      id: generateId(),
      school_id: schoolId,
      exam_id: examId,
      student_id: studentId,
      admit_card_number: `AC-${String(count + 1).padStart(6, '0')}`,
    });
  }

  async generateClassAdmitCards(
    examId: string,
    studentIds: string[],
    schoolId: string,
  ): Promise<AdmitCard[]> {
    const cards: AdmitCard[] = [];
    for (const sid of studentIds) cards.push(await this.generateAdmitCard(examId, sid, schoolId));
    return cards;
  }

  async getStudentAdmitCard(
    examId: string,
    studentId: string,
    schoolId: string,
  ): Promise<AdmitCard | null> {
    return (await this.examsRepo.findAdmitCardByStudent(examId, studentId, schoolId)) ?? null;
  }

  async getClassAdmitCards(
    examId: string,
    classSectionId: string,
    schoolId: string,
  ): Promise<AdmitCard[]> {
    return this.examsRepo.findAdmitCardsByClass(examId, classSectionId, schoolId);
  }

  async previewAdmitCard(examId: string, studentId: string, schoolId: string): Promise<string> {
    const card = await this.examsRepo.findAdmitCardByStudent(examId, studentId, schoolId);
    if (!card) throw new NotFoundException('Admit card not generated yet');
    return `<html><body><h1>Admit Card: ${card.admit_card_number}</h1></body></html>`;
  }

  // Marks
  async submitBulkMarks(
    dto: BulkExamMarksDto,
    schoolId: string,
    createdBy: string,
  ): Promise<ExamMark[]> {
    const results: ExamMark[] = [];
    for (const entry of dto.entries) {
      const mark = await this.examsRepo.upsertMark({
        id: generateId(),
        school_id: schoolId,
        exam_id: dto.exam_id,
        student_id: entry.student_id,
        subject_id: dto.subject_id,
        class_section_id: dto.class_section_id,
        total_marks: String(dto.total_marks),
        marks_obtained: entry.marks_obtained != null ? String(entry.marks_obtained) : undefined,
        is_absent: entry.is_absent ?? false,
        grade: entry.grade,
        created_by: createdBy,
      });
      results.push(mark);
    }
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:marks:*`);
    return results;
  }

  async getExamMarks(
    examId: string,
    schoolId: string,
    classSectionId?: string,
    subjectId?: string,
  ): Promise<ExamMark[]> {
    return this.examsRepo.findMarksByExam(examId, schoolId, classSectionId, subjectId);
  }

  // Remarks
  async addRemark(
    dto: TeacherRemarkDto,
    schoolId: string,
    teacherId: string,
  ): Promise<TeacherRemark> {
    return this.examsRepo.createRemark({
      id: generateId(),
      school_id: schoolId,
      teacher_id: teacherId,
      ...dto,
    });
  }

  async getRemarks(
    schoolId: string,
    examId?: string,
    studentId?: string,
  ): Promise<TeacherRemark[]> {
    return this.examsRepo.findRemarks(schoolId, examId, studentId);
  }

  // Mark Sheets
  async getMarkSheetForStudent(
    studentId: string,
    examId: string,
    schoolId: string,
  ): Promise<ExamMark[]> {
    return this.examsRepo.getMarkSheetForStudent(studentId, examId, schoolId);
  }

  async getMarkSheetForClass(
    classSectionId: string,
    examId: string,
    schoolId: string,
  ): Promise<ExamMark[]> {
    return this.examsRepo.getMarkSheetForClass(classSectionId, examId, schoolId);
  }

  async getAnnualMarkSheet(
    studentId: string,
    schoolId: string,
    academicYearId: string,
  ): Promise<ExamMark[]> {
    return this.examsRepo.getAnnualMarksForStudent(studentId, schoolId, academicYearId);
  }

  async getClassAnnualMarkSheet(
    classSectionId: string,
    schoolId: string,
    academicYearId: string,
  ): Promise<ExamMark[]> {
    return this.examsRepo.getAnnualMarksForClass(classSectionId, schoolId, academicYearId);
  }

  async enqueuePdf(
    jobType: string,
    params: Record<string, string>,
    schoolId: string,
  ): Promise<{ jobId: string }> {
    const jobId = generateId();
    await this.redisService.setex(
      `export_job:marksheet:${jobId}`,
      86400,
      JSON.stringify({ jobId, status: 'PENDING', jobType, params, schoolId }),
    );
    return { jobId };
  }
}
