import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ExamResultsRepository } from './exam-results.repository';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { PaginationResponse } from '../../shared/responses/api-response';
import {
  BulkUpsertExamResultsDto,
  PublishExamResultDto,
  FilterExamResultDto,
  GenerateReportCardDto,
  PublishReportCardDto,
  FilterReportCardDto,
} from './dto/exam-result.dto';
import {
  ExamResultWithStudent,
  ReportCardListRow,
  ReportCardPdfData,
} from './types/exam-result.types';
import {
  generateReportCardPdf,
  resolveGrade,
  buildGradingScaleLabel,
} from './utils/report-card-pdf.utils';
import { REDIS_EXAM_KEYS } from '@shared/redis/redis-key';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ExamResultsService {
  private readonly logger = new Logger(ExamResultsService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(
    private readonly repo: ExamResultsRepository,
    private readonly redisService: RedisService,
    private readonly config: ConfigService,
  ) {
    const endpoint = this.config.get<string>('aws.s3Endpoint');
    this.s3 = new S3Client({
      region: this.config.get<string>('aws.region'),
      credentials: {
        accessKeyId: this.config.get<string>('aws.accessKeyId')!,
        secretAccessKey: this.config.get<string>('aws.secretAccessKey')!,
      },
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    });
    this.bucket = this.config.get<string>('aws.s3Bucket')!;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private resultListKey(schoolId: string, filters: object) {
    return `exam:result:${schoolId}:list:${JSON.stringify(filters)}`;
  }

  private reportCardListKey(schoolId: string, filters: object) {
    return `exam:report_card:${schoolId}:list:${JSON.stringify(filters)}`;
  }

  private async resolveExamOrFail(examId: string, schoolId: string) {
    const exam = await this.repo.findExamWithDetails(examId, schoolId);
    if (!exam) throw new NotFoundException(`Exam '${examId}' not found`);
    // Marks can only be entered/published once the exam has actually started —
    // keeps the natural flow Exam -> Started -> Marks/Attendance -> Report Card.
    if (exam.status && !['STARTED', 'COMPLETED'].includes(exam.status)) {
      throw new BadRequestException(
        `Exam '${exam.exam_name}' has not started yet (status: ${exam.status}) — marks cannot be entered until it does`,
      );
    }
    return exam;
  }

  // ─── Bulk Upsert Exam Results ─────────────────────────────────────────────

  async bulkUpsertResults(dto: BulkUpsertExamResultsDto, schoolId: string, userId: string) {
    await this.resolveExamOrFail(dto.exam_id, schoolId);

    // Validate schedules belong to exam
    const schedules = await this.repo.findExamSchedules(schoolId, dto.exam_id);
    const scheduleMap = new Map(schedules.map((s) => [s.id, s]));

    const newRows = dto.results.map((r) => {
      const schedule = scheduleMap.get(r.exam_schedule_id);
      if (!schedule) {
        throw new BadRequestException(
          `Exam schedule '${r.exam_schedule_id}' does not belong to exam '${dto.exam_id}'`,
        );
      }
      if (r.marks_obtained != null && r.marks_obtained > schedule.exam_marks) {
        throw new BadRequestException(
          `Marks ${r.marks_obtained} exceed max marks ${schedule.exam_marks} for schedule '${r.exam_schedule_id}'`,
        );
      }
      return {
        id: generateId(),
        school_id: schoolId,
        academic_year_id: dto.academic_year_id,
        exam_id: dto.exam_id,
        exam_schedule_id: r.exam_schedule_id,
        class_id: dto.class_id,
        section_id: dto.section_id ?? null,
        student_id: r.student_id,
        subject_id: r.subject_id,
        marks_obtained: r.marks_obtained != null ? String(r.marks_obtained) : null,
        max_marks: schedule.exam_marks,
        is_absent: r.is_absent ?? false,
        created_by: userId,
        updated_by: userId,
      };
    });

    const saved = await this.repo.upsertBulk(newRows);

    // Invalidate result list cache for this exam
    await this.redisService.delByPattern(`exam:result:${schoolId}:*`);

    return {
      upserted: saved.length,
      exam_id: dto.exam_id,
      class_id: dto.class_id,
    };
  }

  // ─── Get Results ─────────────────────────────────────────────────────────

  async findResults(
    schoolId: string,
    filters: FilterExamResultDto,
  ): Promise<ExamResultWithStudent[]> {
    const key = this.resultListKey(schoolId, filters);
    return this.redisService.getOrSet(key, REDIS_EXAM_KEYS.LIST_TTL, () =>
      this.repo.findResultsByExam(schoolId, filters),
    );
  }

  // ─── Publish Exam Results ─────────────────────────────────────────────────

  async publishResults(dto: PublishExamResultDto, schoolId: string) {
    await this.resolveExamOrFail(dto.exam_id, schoolId);

    await this.repo.publishResults(schoolId, dto.exam_id, dto.is_published, {
      classId: dto.class_id,
      sectionId: dto.section_id,
    });

    await this.redisService.delByPattern(`exam:result:${schoolId}:*`);

    return {
      exam_id: dto.exam_id,
      is_published: dto.is_published,
      message: `Results ${dto.is_published ? 'published' : 'unpublished'} successfully`,
    };
  }

  // ─── Generate Report Card ─────────────────────────────────────────────────

  async generateReportCards(dto: GenerateReportCardDto, schoolId: string, userId: string) {
    const exam = await this.resolveExamOrFail(dto.exam_id, schoolId);
    const school = await this.repo.findSchoolById(schoolId);
    if (!school) throw new NotFoundException('School not found');

    // Fetch grading rules
    const grading = await this.repo.findGradingBySchool(schoolId);
    const gradingScaleLabel = buildGradingScaleLabel(grading);

    // Fetch students for the class / section (or single student)
    const students = await this.repo.findStudentsByClassSection(
      schoolId,
      dto.class_id,
      exam.academic_year_id,
      dto.section_id,
      dto.student_id,
    );

    if (!students.length) {
      throw new NotFoundException('No students found for the given criteria');
    }

    const studentIds = students.map((s) => s.student_id);
    const sectionInfo = dto.section_id ? await this.repo.findSectionById(dto.section_id) : null;
    const classInfo = await this.repo.findClassById(dto.class_id);

    // Fetch all results for these students in this exam
    const allResults = await this.repo.findResultsForReportCard(
      schoolId,
      dto.exam_id,
      studentIds,
      exam.academic_year_id,
    );

    // Fetch parents (for father/mother names)
    const parents = await this.repo.findParentsByStudentIds(studentIds);
    const parentMap: Record<string, { father?: string; mother?: string }> = {};
    parents.forEach((p) => {
      if (!parentMap[p.student_id]) parentMap[p.student_id] = {};
      const name = `${p.first_name} ${p.last_name ?? ''}`.trim();
      if (p.relation === 'FATHER') parentMap[p.student_id].father = name;
      if (p.relation === 'MOTHER') parentMap[p.student_id].mother = name;
    });

    // Group results by student
    const resultsByStudent: Record<string, typeof allResults> = {};
    allResults.forEach((r) => {
      if (!resultsByStudent[r.student_id]) resultsByStudent[r.student_id] = [];
      resultsByStudent[r.student_id].push(r);
    });

    // ── Calculate class-wide totals to assign ranks ────────────────────────
    type StudentScore = { student_id: string; scored: number; total: number };
    const scores: StudentScore[] = students.map((s) => {
      const sResults = resultsByStudent[s.student_id] ?? [];
      const scored = sResults.reduce(
        (acc, r) => acc + (r.is_absent ? 0 : parseFloat(r.marks_obtained ?? '0')),
        0,
      );
      const total = sResults.reduce((acc, r) => acc + r.max_marks, 0);
      return { student_id: s.student_id, scored, total };
    });
    scores.sort((a, b) => b.scored - a.scored);
    const rankMap: Record<string, number> = {};
    scores.forEach((s, i) => {
      rankMap[s.student_id] = i + 1;
    });

    // ── Generate PDF per student ───────────────────────────────────────────
    const results: {
      student_id: string;
      student_name: string;
      report_card_id: string;
      pdf_url: string | null;
      status: string;
    }[] = [];

    const issueDate = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    for (const student of students) {
      const sResults = resultsByStudent[student.student_id] ?? [];
      const pInfo = parentMap[student.student_id] ?? {};
      const rank = rankMap[student.student_id] ?? 0;

      const grandTotal = sResults.reduce((a, r) => a + r.max_marks, 0);
      const grandScored = sResults.reduce(
        (a, r) => a + (r.is_absent ? 0 : parseFloat(r.marks_obtained ?? '0')),
        0,
      );
      const pct = grandTotal > 0 ? (grandScored / grandTotal) * 100 : 0;
      const grandGrade = resolveGrade(pct, grading);

      // Build PDF data
      const pdfData: ReportCardPdfData = {
        school: {
          name: school.name,
          // tagline: school.tagline ?? undefined,
          address: school.address ?? undefined,
          contact_number: school.contact_number ?? undefined,
        },
        student: {
          name: `${student.first_name} ${student.last_name ?? ''}`.trim(),
          father_name: pInfo.father ?? 'N/A',
          mother_name: pInfo.mother ?? 'N/A',
          date_of_birth: student.date_of_birth ?? 'N/A',
          roll_number: student.roll_number ?? '-',
          registration_number: student.registration_number ?? '-',
          admission_number: student.admission_number,
          section: sectionInfo?.name ?? '-',
          profile_image: student.profile_image ?? undefined,
        },
        class_name: classInfo?.name ?? '',
        academic_year: exam.academic_year_name ?? '',
        exam_name: exam.exam_name,
        exam_term: exam.exam_term,
        subjects: sResults.map((r) => {
          const isOral = r.subject_type === 'ORAL_EXAM' || r.subject_type === 'PRACTICAL_EXAM';
          const marksNum = r.is_absent ? null : parseFloat(r.marks_obtained ?? '0');
          const pctSubject = marksNum != null ? (marksNum / r.max_marks) * 100 : 0;
          const grade = resolveGrade(pctSubject, grading);
          return {
            name: r.subject_name,
            subject_type: r.subject_type,
            theory_total: isOral ? 0 : r.max_marks,
            theory_scored: isOral ? null : marksNum,
            oral_total: isOral ? r.max_marks : 0,
            oral_scored: isOral ? marksNum : null,
            all_total: r.max_marks,
            total_scored: marksNum,
            grade,
            is_absent: r.is_absent,
          };
        }),
        grand_total_marks: grandTotal,
        grand_total_scored: Math.round(grandScored),
        grand_percentage: pct.toFixed(2),
        grand_grade: grandGrade,
        rank,
        remarks: dto.remarks ?? 'Good',
        co_scholastic: [
          { subject: 'DRAWING', term_detail: '-' },
          { subject: 'DANCE', term_detail: '-' },
        ],
        grading_scale: gradingScaleLabel,
        issue_date: issueDate,
      };

      // Create placeholder report card record
      const rcId = generateId();
      await this.repo.upsertReportCard({
        id: rcId,
        school_id: schoolId,
        academic_year_id: exam.academic_year_id,
        exam_id: dto.exam_id,
        class_id: dto.class_id,
        section_id: dto.section_id ?? null,
        student_id: student.student_id,
        total_marks: grandTotal,
        marks_obtained: String(grandScored),
        percentage: String(pct.toFixed(2)),
        grade: grandGrade,
        rank,
        remarks: dto.remarks ?? null,
        status: 'PENDING',
        created_by: userId,
      });

      // Generate PDF
      let pdfUrl: string | null = null;
      try {
        const pdfBuffer = await generateReportCardPdf(pdfData);

        const { url, s3Key } = await this.uploadReportCardToS3(
          pdfBuffer,
          schoolId,
          dto.exam_id,
          student.student_id,
          rcId,
        );

        pdfUrl = url;

        await this.repo.updateReportCardPdf(rcId, schoolId, {
          pdf_url: pdfUrl,
          pdf_s3_key: s3Key,
          status: 'GENERATED',
        });
      } catch (err) {
        this.logger.error(`PDF generation failed for student ${student.student_id}`, err);
        await this.repo.updateReportCardPdf(rcId, schoolId, {
          pdf_url: '',
          pdf_s3_key: '',
          status: 'FAILED',
        });
      }

      results.push({
        student_id: student.student_id,
        student_name: pdfData.student.name,
        report_card_id: rcId,
        pdf_url: pdfUrl,
        status: pdfUrl ? 'GENERATED' : 'FAILED',
      });
    }

    await this.redisService.delByPattern(`exam:report_card:${schoolId}:*`);

    return {
      generated: results.length,
      results,
    };
  }

  // ─── List Report Cards ────────────────────────────────────────────────────

  async findReportCards(
    schoolId: string,
    filters: FilterReportCardDto,
  ): Promise<PaginationResponse<ReportCardListRow>> {
    const key = this.reportCardListKey(schoolId, filters);
    return this.redisService.getOrSet(key, REDIS_EXAM_KEYS.LIST_TTL, async () => {
      const [items, total] = await Promise.all([
        this.repo.findReportCards(schoolId, filters),
        this.repo.countReportCards(schoolId, filters),
      ]);
      return PaginationResponse.of(items, total, filters);
    });
  }

  // ─── Get single report card ───────────────────────────────────────────────

  async findReportCardById(id: string, schoolId: string) {
    const key = `exam:report_card:${schoolId}:${id}`;
    return this.redisService.getOrSet(key, REDIS_EXAM_KEYS.ITEM_TTL, async () => {
      const rc = await this.repo.findReportCardById(id, schoolId);
      if (!rc) throw new NotFoundException(`Report card '${id}' not found`);
      return rc;
    });
  }

  // ─── Publish Report Cards ─────────────────────────────────────────────────

  async publishReportCards(dto: PublishReportCardDto, schoolId: string) {
    await this.resolveExamOrFail(dto.exam_id, schoolId);

    await this.repo.publishReportCards(schoolId, dto.is_published, {
      examId: dto.exam_id,
      classId: dto.class_id,
      sectionId: dto.section_id,
      studentId: dto.student_id,
    });

    await this.redisService.delByPattern(`exam:report_card:${schoolId}:*`);

    return {
      exam_id: dto.exam_id,
      is_published: dto.is_published,
      message: `Report cards ${dto.is_published ? 'published' : 'unpublished'} successfully`,
    };
  }

  // ─── Delete report card ───────────────────────────────────────────────────

  async deleteReportCard(id: string, schoolId: string) {
    const rc = await this.repo.findReportCardById(id, schoolId);
    if (!rc) throw new NotFoundException(`Report card '${id}' not found`);
    await this.repo.softDeleteReportCard(id, schoolId);
    await this.redisService.delByPattern(`exam:report_card:${schoolId}:*`);
    return { deleted: true };
  }

  private async uploadReportCardToS3(
    buffer: Buffer,
    schoolId: string,
    examId: string,
    studentId: string,
    reportCardId: string,
  ): Promise<{ url: string; s3Key: string }> {
    const s3Key = `report-cards/${schoolId}/${examId}/${studentId}-${reportCardId}.pdf`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
        Body: buffer,
        ContentType: 'application/pdf',
        ContentLength: buffer.length,
      }),
    );

    const baseUrl = this.config.get<string>('aws.s3BaseUrl');
    const region = this.config.get<string>('aws.region');

    const url = baseUrl
      ? `${baseUrl.replace(/\/$/, '')}/${s3Key}`
      : `https://${this.bucket}.s3.${region}.amazonaws.com/${s3Key}`;

    this.logger.log(`Report card uploaded → ${s3Key}`);

    return { url, s3Key };
  }
}
