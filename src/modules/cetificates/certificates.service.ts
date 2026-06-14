import { Injectable, NotFoundException, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { and, eq } from 'drizzle-orm';

import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import * as schema from '../../database/drizzle/schema';

import { RedisService } from '../redis/redis.service';
import { TransferCertificateRepository } from './transfer-certificate.repository';
import { BonafideCertificateRepository } from './bonafide-certificate.repository';

import {
  CreateTransferCertificateDto,
  TransferCertificateFilterDto,
  CreateBonafideCertificateDto,
  BonafideCertificateFilterDto,
} from './dto/certificates.dto';

import {
  TransferCertificateListRow,
  TransferCertificateDetailRow,
  BonafideCertificateListRow,
  BonafideCertificateDetailRow,
  NewTransferCertificate,
  NewBonafideCertificate,
} from './types/certificates.types';

import {
  generateTransferCertificatePdf,
  generateBonafideCertificatePdf,
  TransferCertData,
  BonafideCertData,
} from './util/pdf-generator';

import { PaginationResponse } from '../../shared/responses/api-response';
import { generateId } from '../../utils/uuid.utils';
import { REDIS_CERTIFICATES_KEY } from '@shared/redis/redis-key';

export interface CertificateCreateResult {
  id: string;
  reference_no: string;
  pdf_url: string;
}

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(
    // ── Certificate repositories ───────────────────────────────────────────
    private readonly transferRepo: TransferCertificateRepository,
    private readonly bonafideRepo: BonafideCertificateRepository,
    // ── Raw DB access for student / school lookups ─────────────────────────
    // (These tables belong to other modules; we query them directly rather
    //  than coupling to foreign repositories.)
    @Inject(DRIZZLE_ORM) private readonly db: DrizzleDB,
    // ── Infrastructure ────────────────────────────────────────────────────
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

  // ──────────────────────────────────────────────────────────────────────────
  // TRANSFER CERTIFICATE
  // ──────────────────────────────────────────────────────────────────────────

  async findAllTransfer(
    schoolId: string,
    filters: TransferCertificateFilterDto,
  ): Promise<PaginationResponse<TransferCertificateListRow>> {
    const cacheKey = REDIS_CERTIFICATES_KEY.TRANSFER_LIST(schoolId, JSON.stringify(filters));

    return this.redisService.getOrSet(
      cacheKey,
      REDIS_CERTIFICATES_KEY.LIST_TTL,
      async () => {
        const [items, total] = await Promise.all([
          this.transferRepo.findAll(schoolId, filters),
          this.transferRepo.count(schoolId, filters),
        ]);
        return PaginationResponse.of(items, total, filters);
      },
    );
  }

  async findTransferById(id: string, schoolId: string): Promise<TransferCertificateDetailRow> {
    const cacheKey = REDIS_CERTIFICATES_KEY.TRANSFER_ITEM(schoolId, id);

    return this.redisService.getOrSet(
      cacheKey,
      REDIS_CERTIFICATES_KEY.ITEM_TTL,
      async () => {
        const cert = await this.transferRepo.findById(id, schoolId);
        if (!cert) throw new NotFoundException(`Transfer certificate '${id}' not found`);
        return cert;
      },
    );
  }

  async createTransferCertificate(
    dto: CreateTransferCertificateDto,
    schoolId: string,
    userId: string,
  ): Promise<CertificateCreateResult> {
    // 1. Guard — student must belong to this school
    const student = await this.db.query.students.findFirst({
      where: and(
        eq(schema.students.id, dto.student_id),
        eq(schema.students.school_id, schoolId),
        eq(schema.students.deleted, false),
      ),
    });
    if (!student) throw new NotFoundException('Student not found');

    // 2. Fetch all supporting data in parallel
    const [school, academicInfo, addresses, parents, academicYear, classInfo] = await Promise.all([
      this.db.query.schools.findFirst({
        where: eq(schema.schools.id, schoolId),
      }),
      this.db.query.studentAcademicInfo.findFirst({
        where: and(
          eq(schema.studentAcademicInfo.student_id, dto.student_id),
          eq(schema.studentAcademicInfo.academic_year_id, dto.academic_year_id),
          eq(schema.studentAcademicInfo.deleted, false),
        ),
      }),
      this.db.query.studentAddresses.findMany({
        where: and(
          eq(schema.studentAddresses.student_id, dto.student_id),
          eq(schema.studentAddresses.deleted, false),
        ),
      }),
      this.db.query.studentParents.findMany({
        where: and(
          eq(schema.studentParents.student_id, dto.student_id),
          eq(schema.studentParents.deleted, false),
        ),
      }),
      this.db.query.academicYears.findFirst({
        where: eq(schema.academicYears.id, dto.academic_year_id),
      }),
      this.db.query.classes.findFirst({
        where: eq(schema.classes.id, dto.class_id),
      }),
    ]);

    // 3. Derive parent relationships
    const father = parents.find((p) => p.relation === 'FATHER');
    const mother = parents.find((p) => p.relation === 'MOTHER');
    const primaryParent = parents.find((p) => p.is_primary) ?? father;

    // 4. Generate sequential reference number scoped to this school
    const existingCount = await this.transferRepo.countBySchool(schoolId);
    const refNo = this.buildRefNo('TC', schoolId, existingCount + 1);

    // 5. Assemble PDF data
    const issueDate = this.formatDateIN(new Date());
    const pdfData: TransferCertData = {
      school: {
        name: school?.name ?? 'School Name',
        tagline: 'Committed To Excellence In Education',
        address: this.joinAddress(school?.address, school?.city, school?.state, school?.pincode),
        contact_number: school?.contact_number ?? '',
      },
      student: {
        first_name: student.first_name,
        last_name: student.last_name ?? '',
        date_of_birth: student.date_of_birth
          ? this.formatDateIN(new Date(student.date_of_birth))
          : '-',
        aadhaar_number: student.aadhaar_number ?? '-',
        roll_number: academicInfo?.roll_number ?? '-',
        admission_number: academicInfo?.admission_number ?? '-',
        enrollment_number: academicInfo?.registration_number ?? '-',
        pen_number: '-',
        permanent_address: addresses[0]
          ? this.joinAddress(
              addresses[0].address,
              addresses[0].city,
              addresses[0].state,
              addresses[0].pincode,
            )
          : '-',
        temporary_address: addresses[1]
          ? this.joinAddress(
              addresses[1].address,
              addresses[1].city,
              addresses[1].state,
              addresses[1].pincode,
            )
          : '-',
        father_name: father ? `${father.first_name} ${father.last_name ?? ''}`.trim() : '-',
        mother_name: mother ? `${mother.first_name} ${mother.last_name ?? ''}`.trim() : '-',
        guardian_relation: primaryParent?.relation ?? 'PARENT',
      },
      cert: {
        reference_no: refNo,
        class_with_session: `${classInfo?.name ?? '-'} (${academicYear?.name ?? '-'})`,
        qualified_for_higher_class: dto.qualified_for_higher_class,
        date_of_admission: academicInfo?.joining_date
          ? this.formatDateIN(new Date(academicInfo.joining_date))
          : '-',
        leaving_date: dto.leaving_date,
        total_working_days: dto.total_working_days,
        total_present: dto.total_present,
        extra_activities: dto.extra_activities,
        candidate_character: dto.candidate_character,
        leaving_reason: dto.leaving_reason,
        fees_due: dto.fees_due,
        issue_date: issueDate,
      },
    };

    // 6. Generate PDF buffer → upload to S3
    const pdfBuffer = await generateTransferCertificatePdf(pdfData);
    const { url: pdfUrl, s3Key: pdfS3Key } = await this.uploadPdfToS3(
      pdfBuffer,
      schoolId,
      `transfer-cert-${refNo}`,
    );

    // 7. Persist via repository
    const payload: NewTransferCertificate = {
      id: generateId(),
      school_id: schoolId,
      student_id: dto.student_id,
      academic_year_id: dto.academic_year_id,
      class_id: dto.class_id,
      section_id: dto.section_id,
      reference_no: refNo,
      qualified_for_higher_class: dto.qualified_for_higher_class,
      leaving_date: dto.leaving_date,
      total_working_days: dto.total_working_days,
      total_present: dto.total_present,
      extra_activities: dto.extra_activities,
      candidate_character: dto.candidate_character,
      leaving_reason: dto.leaving_reason,
      fees_due: dto.fees_due,
      pdf_url: pdfUrl,
      pdf_s3_key: pdfS3Key,
      status: 'GENERATED',
      created_by: userId,
    };

    const created = await this.transferRepo.create(payload);

    // 8. Bust list cache for this school
    await this.redisService.delByPattern(
      `${REDIS_CERTIFICATES_KEY.TRANSFER_NS(schoolId)}:list:*`,
    );

    return { id: created.id, reference_no: refNo, pdf_url: pdfUrl };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // BONAFIDE CERTIFICATE
  // ──────────────────────────────────────────────────────────────────────────

  async findAllBonafide(
    schoolId: string,
    filters: BonafideCertificateFilterDto,
  ): Promise<PaginationResponse<BonafideCertificateListRow>> {
    const cacheKey = REDIS_CERTIFICATES_KEY.BONAFIDE_LIST(schoolId, JSON.stringify(filters));

    return this.redisService.getOrSet(
      cacheKey,
      REDIS_CERTIFICATES_KEY.LIST_TTL,
      async () => {
        const [items, total] = await Promise.all([
          this.bonafideRepo.findAll(schoolId, filters),
          this.bonafideRepo.count(schoolId, filters),
        ]);
        return PaginationResponse.of(items, total, filters);
      },
    );
  }

  async findBonafideById(id: string, schoolId: string): Promise<BonafideCertificateDetailRow> {
    const cacheKey = REDIS_CERTIFICATES_KEY.BONAFIDE_ITEM(schoolId, id);

    return this.redisService.getOrSet(
      cacheKey,
      REDIS_CERTIFICATES_KEY.ITEM_TTL,
      async () => {
        const cert = await this.bonafideRepo.findById(id, schoolId);
        if (!cert) throw new NotFoundException(`Bonafide certificate '${id}' not found`);
        return cert;
      },
    );
  }

  async createBonafideCertificate(
    dto: CreateBonafideCertificateDto,
    schoolId: string,
    userId: string,
  ): Promise<CertificateCreateResult> {
    // 1. Guard
    const student = await this.db.query.students.findFirst({
      where: and(
        eq(schema.students.id, dto.student_id),
        eq(schema.students.school_id, schoolId),
        eq(schema.students.deleted, false),
      ),
    });
    if (!student) throw new NotFoundException('Student not found');

    // 2. Fetch supporting data in parallel
    const [school, academicInfo, parents, academicYear, classInfo] = await Promise.all([
      this.db.query.schools.findFirst({
        where: eq(schema.schools.id, schoolId),
      }),
      this.db.query.studentAcademicInfo.findFirst({
        where: and(
          eq(schema.studentAcademicInfo.student_id, dto.student_id),
          eq(schema.studentAcademicInfo.academic_year_id, dto.academic_year_id),
          eq(schema.studentAcademicInfo.deleted, false),
        ),
      }),
      this.db.query.studentParents.findMany({
        where: and(
          eq(schema.studentParents.student_id, dto.student_id),
          eq(schema.studentParents.deleted, false),
        ),
      }),
      this.db.query.academicYears.findFirst({
        where: eq(schema.academicYears.id, dto.academic_year_id),
      }),
      this.db.query.classes.findFirst({
        where: eq(schema.classes.id, dto.class_id),
      }),
    ]);

    const father = parents.find((p) => p.relation === 'FATHER');

    // 3. Generate reference number
    const existingCount = await this.bonafideRepo.countBySchool(schoolId);
    const refNo = this.buildRefNo('BC', schoolId, existingCount + 1);

    // 4. Assemble PDF data
    const issueDate = this.formatDateIN(new Date());
    const pdfData: BonafideCertData = {
      school: {
        name: school?.name ?? 'School',
        tagline: 'Committed To Excellence In Education',
        address: this.joinAddress(school?.address, school?.city, school?.state, school?.pincode),
        contact_number: school?.contact_number ?? '',
      },
      student: {
        first_name: student.first_name,
        last_name: student.last_name ?? '',
        date_of_birth: student.date_of_birth
          ? this.formatDateIN(new Date(student.date_of_birth))
          : '-',
        admission_number: academicInfo?.admission_number ?? '-',
        father_name: father ? `${father.first_name} ${father.last_name ?? ''}`.trim() : '-',
      },
      cert: {
        reference_no: refNo,
        class_name: classInfo?.name ?? '-',
        academic_year: academicYear?.name ?? '-',
        purpose: dto.purpose,
        issue_date: issueDate,
      },
    };

    // 5. Generate PDF → upload to S3
    const pdfBuffer = await generateBonafideCertificatePdf(pdfData);
    const { url: pdfUrl, s3Key: pdfS3Key } = await this.uploadPdfToS3(
      pdfBuffer,
      schoolId,
      `bonafide-cert-${refNo}`,
    );

    // 6. Persist via repository
    const payload: NewBonafideCertificate = {
      id: generateId(),
      school_id: schoolId,
      student_id: dto.student_id,
      academic_year_id: dto.academic_year_id,
      class_id: dto.class_id,
      section_id: dto.section_id,
      reference_no: refNo,
      purpose: dto.purpose,
      pdf_url: pdfUrl,
      pdf_s3_key: pdfS3Key,
      status: 'GENERATED',
      created_by: userId,
    };

    const created = await this.bonafideRepo.create(payload);

    // 7. Bust list cache
    await this.redisService.delByPattern(
      `${REDIS_CERTIFICATES_KEY.BONAFIDE_NS(schoolId)}:list:*`,
    );

    return { id: created.id, reference_no: refNo, pdf_url: pdfUrl };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ──────────────────────────────────────────────────────────────────────────

  private async uploadPdfToS3(
    buffer: Buffer,
    schoolId: string,
    filename: string,
  ): Promise<{ url: string; s3Key: string }> {
    const s3Key = `${schoolId}/certificates/${filename}-${Date.now()}.pdf`;

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

    this.logger.log(`PDF uploaded → ${s3Key}`);
    return { url, s3Key };
  }

  /** Builds "TC-ABCD-0001" or "BC-ABCD-0042" */
  private buildRefNo(prefix: string, schoolId: string, n: number): string {
    return `${prefix}-${schoolId.slice(0, 4).toUpperCase()}-${String(n).padStart(4, '0')}`;
  }

  private formatDateIN(date: Date): string {
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  private joinAddress(...parts: (string | null | undefined)[]): string {
    return parts.filter(Boolean).join(', ') || '-';
  }
}