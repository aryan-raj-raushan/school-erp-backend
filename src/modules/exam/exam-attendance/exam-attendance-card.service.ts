import { Injectable, NotFoundException } from '@nestjs/common';
import { ExamAttendanceCardRepository } from './exam-attendance-card.repository';
import { RedisService } from '../../redis/redis.service';
import { REDIS_EXAM_KEYS } from '@shared/redis/redis-key';

export interface AttendanceCardData {
  examName: string;
  className: string;
  sectionName?: string;
  academicYear: string;
  schedules: {
    subjectName: string;
    examDate: string;
    startTime: string;
    endTime: string;
  }[];
  students: {
    rollNumber: string;
    admissionNumber: string;
    studentName: string;
    signatures: string[]; // empty slots — one per schedule
  }[];
}

/**
 * Module 5 – Exam Attendance Card
 *
 * Generates raw data for the attendance card PDF.
 * Actual PDF rendering is delegated to a PDF library (e.g. PDFKit / Puppeteer).
 * The controller streams the response as application/pdf.
 */
@Injectable()
export class ExamAttendanceCardService {
  constructor(
    private readonly attendanceCardRepository: ExamAttendanceCardRepository,
    private readonly redis: RedisService,
  ) {}

  async getAttendanceCardData(
    examId: string,
    classId: string,
    sectionId: string | undefined,
    academicYearId: string,
    schoolId: string,
  ): Promise<AttendanceCardData> {
    const key = REDIS_EXAM_KEYS.ATTENDANCE_CARD.ITEM(schoolId, examId, classId, sectionId);

    return this.redis.getOrSet(key, REDIS_EXAM_KEYS.ITEM_TTL, async () => {
      // 1. Fetch exam
      const exam = await this.attendanceCardRepository.findExamByIdAndSchool(examId, schoolId);
      if (!exam) throw new NotFoundException(`Exam '${examId}' not found`);

      // 2. Fetch schedules for this exam / class
      const scheduleRows = await this.attendanceCardRepository.findExamSchedulesByClassAndExam(
        examId,
        classId,
        schoolId,
      );

      // 3. Fetch students for the class (optionally filtered by section)
      const studentRows = await this.attendanceCardRepository.findStudentsByClass(
        classId,
        academicYearId,
        schoolId,
        sectionId,
      );

      return {
        examName: exam.exam_name,
        className: classId, // caller should resolve names from IDs as needed
        sectionName: sectionId,
        academicYear: academicYearId,
        schedules: scheduleRows.map((s) => ({
          subjectName: s.subject_name,
          examDate: s.exam_date,
          startTime: s.start_time,
          endTime: s.end_time,
        })),
        students: studentRows.map((s) => ({
          rollNumber: s.rollNumber ?? '-',
          admissionNumber: s.admissionNumber,
          studentName: `${s.firstName} ${s.lastName ?? ''}`.trim(),
          signatures: scheduleRows.map(() => ''), // blank signature slot per subject
        })),
      };
    });
  }
}
