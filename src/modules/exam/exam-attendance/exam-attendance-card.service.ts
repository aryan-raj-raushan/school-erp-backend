import { Injectable, NotFoundException } from '@nestjs/common';
import { ExamAttendanceCardRepository } from './exam-attendance-card.repository';
import { RedisService } from '../../redis/redis.service';
import { REDIS_EXAM_KEYS } from '@shared/redis/redis-key';

export interface AttendanceCardData {
  examName: string;
  className: string;
  sectionName?: string;
  academicYear: string;
  school: {
    name: string;
    address: string | null;
    phone: string | null;
    logoUrl: string | null;
  };
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
    parentName: string | null;
    photoUrl: string | null;
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
      const [exam, classRow, sectionRow, academicYearRow, school] = await Promise.all([
        this.attendanceCardRepository.findExamByIdAndSchool(examId, schoolId),
        this.attendanceCardRepository.findClassById(classId, schoolId),
        sectionId
          ? this.attendanceCardRepository.findSectionById(sectionId, schoolId)
          : Promise.resolve(null),
        this.attendanceCardRepository.findAcademicYearById(academicYearId, schoolId),
        this.attendanceCardRepository.findSchoolProfile(schoolId),
      ]);
      if (!exam) throw new NotFoundException(`Exam '${examId}' not found`);
      if (!classRow) throw new NotFoundException(`Class '${classId}' not found`);

      const [scheduleRows, studentRows] = await Promise.all([
        this.attendanceCardRepository.findExamSchedulesByClassAndExam(examId, classId, schoolId),
        this.attendanceCardRepository.findStudentsByClass(
          classId,
          academicYearId,
          schoolId,
          sectionId,
        ),
      ]);

      const parentsByStudent = await this.attendanceCardRepository.findPrimaryParentsByStudentIds(
        studentRows.map((s) => s.studentId),
        schoolId,
      );

      return {
        examName: exam.exam_name,
        className: classRow.name,
        sectionName: sectionRow?.name,
        academicYear: academicYearRow?.name ?? '',
        school: {
          name: school?.name ?? '',
          address: [school?.address, school?.city, school?.state].filter(Boolean).join(', ') || null,
          phone: school?.contactNumber ? `${school.dialCode ?? ''}${school.contactNumber}` : null,
          logoUrl: school?.logoUrl ?? null,
        },
        schedules: scheduleRows.map((s) => ({
          subjectName: s.subject_name,
          examDate: s.exam_date,
          startTime: s.start_time,
          endTime: s.end_time,
        })),
        students: studentRows.map((s) => {
          const parent = parentsByStudent.get(s.studentId);
          return {
            rollNumber: s.rollNumber ?? '-',
            admissionNumber: s.admissionNumber,
            studentName: `${s.firstName} ${s.lastName ?? ''}`.trim(),
            parentName: parent ? `${parent.firstName} ${parent.lastName ?? ''}`.trim() : null,
            photoUrl: s.profileImage ?? null,
            signatures: scheduleRows.map(() => ''), // blank signature slot per subject
          };
        }),
      };
    });
  }
}
