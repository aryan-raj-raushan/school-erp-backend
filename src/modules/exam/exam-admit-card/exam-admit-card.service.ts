import { Injectable, NotFoundException } from '@nestjs/common';
import { ExamAdmitCardRepository } from './exam-admit-card.repository';
import { RedisService } from '../../redis/redis.service';
import { REDIS_EXAM_KEYS } from '@shared/redis/redis-key';

export interface AdmitCardData {
  school: {
    id: string;
    name: string;
  };
  student: {
    id: string;
    name: string;
    admissionNumber: string;
    rollNumber?: string;
    className: string;
    sectionName?: string;
    profileImage?: string;
  };
  exam: {
    name: string;
    term: string;
    startDate: string;
    endDate: string;
  };
  schedules: {
    subjectName: string;
    subjectType: string;
    examDate: string;
    startTime: string;
    endTime: string;
    examMarks: number;
    passingMarks: number;
  }[];
}

/**
 * Module 9 – Student Admit Card
 *
 * Fetches all data needed to render an admit card for a student for a given exam.
 * PDF rendering is done in the controller.
 */
@Injectable()
export class ExamAdmitCardService {
  constructor(
    private readonly admitCardRepository: ExamAdmitCardRepository,
    private readonly redis: RedisService,
  ) {}

  async getAdmitCardData(
    studentId: string,
    examId: string,
    academicYearId: string,
    schoolId: string,
  ): Promise<AdmitCardData> {
    const key = REDIS_EXAM_KEYS.ADMIT_CARD.ITEM(schoolId, examId, studentId, academicYearId);

    return this.redis.getOrSet(key, REDIS_EXAM_KEYS.ITEM_TTL, async () => {
      // 1. Fetch exam
      const exam = await this.admitCardRepository.findExamByIdAndSchool(examId, schoolId);
      if (!exam) throw new NotFoundException(`Exam '${examId}' not found`);
      if (!exam.is_published) throw new NotFoundException('Exam schedule is not yet published');

      // 2. Fetch student academic info
      const info = await this.admitCardRepository.findStudentAcademicInfo(
        studentId,
        academicYearId,
        schoolId,
      );
      if (!info)
        throw new NotFoundException(`Student '${studentId}' not found for this academic year`);

      // 3. Fetch exam schedules for this class
      const scheduleRows = await this.admitCardRepository.findExamSchedulesByClassAndExam(
        examId,
        info.classId,
        schoolId,
      );

      // 4. Fetch school
      const school = await this.admitCardRepository.findSchoolById(schoolId);
      if (!school) throw new NotFoundException(`School '${schoolId}' not found`);

      return {
        school: { id: school.id, name: school.name },
        student: {
          id: info.studentId,
          name: `${info.firstName} ${info.lastName ?? ''}`.trim(),
          admissionNumber: info.admissionNumber,
          rollNumber: info.rollNumber ?? undefined,
          className: info.className ?? info.classId,
          sectionName: info.sectionName ?? undefined,
          profileImage: info.profileImage ?? undefined,
        },
        exam: {
          name: exam.exam_name,
          term: exam.exam_term,
          startDate: exam.start_date,
          endDate: exam.end_date,
        },
        schedules: scheduleRows.map((s) => ({
          subjectName: s.subject_name,
          subjectType: s.subject_type,
          examDate: s.exam_date,
          startTime: s.start_time,
          endTime: s.end_time,
          examMarks: s.exam_marks,
          passingMarks: s.passing_marks,
        })),
      };
    });
  }
}
