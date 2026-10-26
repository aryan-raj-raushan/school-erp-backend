import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { StudentsRepository } from './students.repository';
import { RedisService } from '../redis/redis.service';
import { UploadsService } from '../uploads/uploads.service';
import { generateId } from '../../utils/uuid.utils';
import { generateTempPassword, hashPassword } from '../../utils/hash.utils';
import {
  CreateStudentDto,
  StudentAcademicInfoDto,
  StudentDocumentDto,
  StudentParentDto,
} from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import {
  StudentFull,
  StudentFullWithCredentials,
  ParentCredential,
  StudentFilters,
  StudentListItem,
  StudentAcademicInfo,
  NewStudent,
  NewStudentParent,
  NewStudentDocument,
} from './types/student.types';
import { REDIS_STUDENT_KEY } from '@shared/redis/redis-key';

@Injectable()
export class StudentsService {
  constructor(
    private readonly repo: StudentsRepository,
    private readonly redisService: RedisService,
    private readonly uploadsService: UploadsService,
  ) {}

  private assertOwnDocumentLinks(
    documents: StudentDocumentDto[] | undefined,
    schoolId: string,
    existingLinks: string[] = [],
  ) {
    const foreign = documents?.find(
      (d) =>
        !existingLinks.includes(d.document_link) &&
        !UploadsService.keyFromUrl(d.document_link)?.startsWith(`${schoolId}/`),
    );
    if (foreign) {
      throw new BadRequestException(
        `Document "${foreign.original_filename ?? foreign.document_name}" must be uploaded through the app`,
      );
    }
  }

  private cacheKey(schoolId: string) {
    return REDIS_STUDENT_KEY.STUDENT(schoolId);
  }

  private async buildParentRows(
    parents: StudentParentDto[] | undefined,
    schoolId: string,
    studentId: string,
  ): Promise<{ rows: (NewStudentParent & { id: string })[]; credentials: ParentCredential[] }> {
    if (!parents?.length) return { rows: [], credentials: [] };

    const credentials: ParentCredential[] = [];
    const rows = await Promise.all(
      parents.map(async (p) => {
        const { id, enable_login, reset_password, ...rest } = p;
        const base: NewStudentParent & { id: string } = {
          id: id ?? generateId(),
          school_id: schoolId,
          student_id: studentId,
          ...rest,
          relation: rest.relation as NewStudentParent['relation'],
          qualification: rest.qualification as NewStudentParent['qualification'],
        };

        if (!enable_login) return { ...base, is_active: false };

        if (!reset_password) {
          const existing = id ? await this.repo.findGuardianById(id, schoolId) : null;
          if (existing?.has_login) return { ...base, is_active: true };

          const sharedCreds = await this.repo.findActiveCredentialsByPhone(
            rest.phone_number,
            rest.dial_code ?? '+91',
          );
          if (sharedCreds) {
            return {
              ...base,
              password_hash: sharedCreds.password_hash,
              must_change_password: sharedCreds.must_change_password,
              is_active: true,
            };
          }
        }

        const temporaryPassword = generateTempPassword();
        credentials.push({
          parent_id: base.id,
          name: [rest.first_name, rest.last_name].filter(Boolean).join(' '),
          dial_code: rest.dial_code ?? '+91',
          phone_number: rest.phone_number,
          temporary_password: temporaryPassword,
        });
        return {
          ...base,
          password_hash: await hashPassword(temporaryPassword),
          must_change_password: true,
          is_active: true,
        };
      }),
    );
    return { rows, credentials };
  }

  private async saveParents(
    studentId: string,
    schoolId: string,
    parents: StudentParentDto[] | undefined,
  ) {
    const { rows, credentials } = await this.buildParentRows(parents, schoolId, studentId);
    const saved = await this.repo.syncParents(studentId, schoolId, rows);
    await Promise.all(
      rows
        .filter((r) => credentials.some((c) => c.parent_id === r.id))
        .map((r) =>
          this.repo.shareParentPassword(r.phone_number, r.dial_code ?? '+91', r.password_hash!),
        ),
    );
    return { saved, credentials };
  }

  private async generateAdmissionNumber(schoolId: string, reserve: boolean): Promise<string> {
    const format = await this.repo.findAdmissionFormat(schoolId);
    if (!format) throw new NotFoundException('School not found');

    const startNumber = format.start_number ?? 1;
    const sequence = reserve
      ? await this.repo.nextAdmissionSequence(schoolId, startNumber)
      : Math.max((format.last_number ?? 0) + 1, startNumber);

    const prefix = format.prefix || format.school_code || 'ADM';
    const year = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
    }).format(new Date());
    const number = String(sequence).padStart(format.digits ?? 5, '0');
    return (format.include_year ?? true) ? `${prefix}-${year}-${number}` : `${prefix}-${number}`;
  }

  private async nextRollNumber(
    schoolId: string,
    academicYearId: string,
    classId: string,
    sectionId?: string | null,
  ): Promise<string> {
    const max = await this.repo.maxRollNumber(schoolId, academicYearId, classId, sectionId);
    return String(max + 1);
  }

  private async resolveAcademicNumbers(
    schoolId: string,
    info: StudentAcademicInfoDto,
    current?: StudentAcademicInfo,
    studentId?: string,
  ): Promise<{
    admission_number: string;
    registration_number: string | null;
    roll_number: string;
  }> {
    const scope = {
      academicYearId: info.academic_year_id,
      classId: info.class_id,
      sectionId: info.section_id ?? null,
    };

    if (
      info.admission_number &&
      info.admission_number !== current?.admission_number &&
      (await this.repo.findAcademicNumberClash(
        schoolId,
        'admission_number',
        info.admission_number,
        studentId,
      ))
    ) {
      throw new ConflictException(`Admission number '${info.admission_number}' is already in use`);
    }

    if (
      info.registration_number &&
      (await this.repo.findAcademicNumberClash(
        schoolId,
        'registration_number',
        info.registration_number,
        studentId,
      ))
    ) {
      throw new ConflictException(
        `Registration number '${info.registration_number}' is already in use`,
      );
    }

    const sameSection =
      current?.academic_year_id === info.academic_year_id &&
      current?.class_id === info.class_id &&
      (current?.section_id ?? null) === scope.sectionId;

    if (
      info.roll_number &&
      (await this.repo.findAcademicNumberClash(
        schoolId,
        'roll_number',
        info.roll_number,
        studentId,
        scope,
      ))
    ) {
      throw new ConflictException(
        `Roll number ${info.roll_number} is already taken in this class/section`,
      );
    }

    const admissionNumber =
      info.admission_number ??
      current?.admission_number ??
      (await this.generateAdmissionNumber(schoolId, true));

    const rollNumber =
      info.roll_number ??
      (sameSection && current?.roll_number
        ? current.roll_number
        : await this.nextRollNumber(
            schoolId,
            info.academic_year_id,
            info.class_id,
            scope.sectionId,
          ));

    return {
      admission_number: admissionNumber,
      registration_number:
        info.registration_number === undefined
          ? (current?.registration_number ?? null)
          : info.registration_number,
      roll_number: rollNumber,
    };
  }

  async previewNumbers(
    schoolId: string,
    academicYearId?: string,
    classId?: string,
    sectionId?: string,
  ): Promise<{ admission_number: string; roll_number: string | null; last_issued: number }> {
    const [admissionNumber, format] = await Promise.all([
      this.generateAdmissionNumber(schoolId, false),
      this.repo.findAdmissionFormat(schoolId),
    ]);
    const rollNumber =
      academicYearId && classId
        ? await this.nextRollNumber(schoolId, academicYearId, classId, sectionId ?? null)
        : null;
    return {
      admission_number: admissionNumber,
      roll_number: rollNumber,
      last_issued: format?.last_number ?? 0,
    };
  }


  // ─── List ───────────────────────────────────────────────────────────────────

  async findAll(schoolId: string, filters: StudentFilters): Promise<StudentListItem[]> {
    const key = `${this.cacheKey(schoolId)}:list:${JSON.stringify(filters)}`;
    return this.redisService.getOrSet(key, REDIS_STUDENT_KEY.CACHE_TTL, () =>
      this.repo.findAll(schoolId, filters),
    );
  }

  // ─── Single (full) ──────────────────────────────────────────────────────────

  async findById(id: string, schoolId: string): Promise<StudentFull> {
    const key = `${this.cacheKey(schoolId)}:${id}`;
    return this.redisService.getOrSet(key, REDIS_STUDENT_KEY.CACHE_TTL, () =>
      this.getFullStudent(id, schoolId),
    );
  }

  private async getFullStudent(id: string, schoolId: string): Promise<StudentFull> {
    const student = await this.repo.findById(id, schoolId);
    if (!student) throw new NotFoundException(`Student '${id}' not found`);

    const [academicInfo, previousAcademics, address, hostelInfo, parents, documents] =
      await Promise.all([
        this.repo.findCurrentAcademicInfo(id, schoolId),
        this.repo.findPreviousAcademics(id, schoolId),
        this.repo.findAddress(id, schoolId),
        this.repo.findHostelInfo(id, schoolId),
        this.repo.findParents(id, schoolId),
        this.repo.findDocuments(id, schoolId),
      ]);

    return {
      student,
      academicInfo: academicInfo ?? null,
      previousAcademics: previousAcademics ?? null,
      address: address ?? null,
      hostelInfo: hostelInfo ?? null,
      parents,
      documents,
    };
  }

  // ─── Create ─────────────────────────────────────────────────────────────────

  async create(
    dto: CreateStudentDto,
    schoolId: string,
    createdBy: string,
  ): Promise<StudentFullWithCredentials> {
    this.assertOwnDocumentLinks(dto.documents, schoolId);
    const academicNumbers = dto.academic_info
      ? await this.resolveAcademicNumbers(schoolId, dto.academic_info)
      : undefined;
    const systemNumber = await this.repo.nextSystemNumber(schoolId);
    const studentId = generateId();

    const student = await this.repo.create({
      id: studentId,
      school_id: schoolId,
      system_number: systemNumber,
      admission_enquiry_id: dto.admission_enquiry_id,
      first_name: dto.first_name,
      last_name: dto.last_name,
      date_of_birth: dto.date_of_birth,
      gender: dto.gender as NewStudent['gender'],
      blood_group: dto.blood_group as NewStudent['blood_group'],
      religion: dto.religion as NewStudent['religion'],
      category: dto.category as NewStudent['category'],
      caste: dto.caste,
      nationality: dto.nationality,
      aadhaar_number: dto.aadhaar_number,
      id_card_number: dto.id_card_number,
      height_cm: dto.height_cm,
      weight_kg: dto.weight_kg,
      profile_image: dto.profile_image,
      dial_code: dto.dial_code,
      phone_number: dto.phone_number,
      email: dto.email,
      status: (dto.status as NewStudent['status']) ?? 'ACTIVE',
      is_enabled: dto.is_enabled ?? true,
      created_by: createdBy,
    });

    const [academicInfo, previousAcademics, address, hostelInfo, parentResult, documents] =
      await Promise.all([
        dto.academic_info
          ? this.repo.upsertAcademicInfo({
              id: generateId(),
              school_id: schoolId,
              student_id: studentId,
              academic_year_id: dto.academic_info.academic_year_id,
              class_id: dto.academic_info.class_id,
              section_id: dto.academic_info.section_id,
              ...academicNumbers!,
              joining_date: dto.academic_info.joining_date,
              is_current: true,
            })
          : Promise.resolve(undefined),

        dto.previous_academics
          ? this.repo.upsertPreviousAcademics({
              id: generateId(),
              school_id: schoolId,
              student_id: studentId,
              ...dto.previous_academics,
            })
          : Promise.resolve(undefined),

        dto.address
          ? this.repo.upsertAddress({
              id: generateId(),
              school_id: schoolId,
              student_id: studentId,
              ...dto.address,
            })
          : Promise.resolve(undefined),

        dto.hostel_info
          ? this.repo.upsertHostelInfo({
              id: generateId(),
              school_id: schoolId,
              student_id: studentId,
              ...dto.hostel_info,
            })
          : Promise.resolve(undefined),

        this.saveParents(studentId, schoolId, dto.parents),

        dto.documents?.length
          ? this.repo.addDocuments(
              dto.documents.map((d) => ({
                id: generateId(),
                school_id: schoolId,
                student_id: studentId,
                ...d,
                document_name: d.document_name as NewStudentDocument['document_name'],
                file_type: d.file_type as NewStudentDocument['file_type'],
                uploaded_by: createdBy,
              })),
            )
          : Promise.resolve([]),
      ]);

    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:list:*`);
    await this.redisService.delByPattern(`dashboard:*:${schoolId}:*`);
    await this.redisService.delByPattern(`reports:admin:${schoolId}`);

    return {
      student,
      academicInfo: academicInfo ?? null,
      previousAcademics: previousAcademics ?? null,
      address: address ?? null,
      hostelInfo: hostelInfo ?? null,
      parents: parentResult.saved,
      documents,
      parent_credentials: parentResult.credentials,
    };
  }

  // ─── Update ─────────────────────────────────────────────────────────────────

  async update(
    id: string,
    schoolId: string,
    dto: UpdateStudentDto,
  ): Promise<StudentFullWithCredentials> {
    // Ensure student exists
    const existing = await this.repo.findById(id, schoolId);
    if (!existing) throw new NotFoundException(`Student '${id}' not found`);
    if (dto.documents) {
      const currentDocs = await this.repo.findDocuments(id, schoolId);
      this.assertOwnDocumentLinks(
        dto.documents,
        schoolId,
        currentDocs.map((d) => d.document_link),
      );
    }

    await this.repo.update(id, schoolId, {
      first_name: dto.first_name,
      last_name: dto.last_name,
      date_of_birth: dto.date_of_birth,
      gender: dto.gender as NewStudent['gender'],
      blood_group: dto.blood_group as NewStudent['blood_group'],
      religion: dto.religion as NewStudent['religion'],
      category: dto.category as NewStudent['category'],
      caste: dto.caste,
      nationality: dto.nationality,
      aadhaar_number: dto.aadhaar_number,
      id_card_number: dto.id_card_number,
      height_cm: dto.height_cm,
      weight_kg: dto.weight_kg,
      profile_image: dto.profile_image,
      dial_code: dto.dial_code,
      phone_number: dto.phone_number,
      email: dto.email,
      status: dto.status as NewStudent['status'],
      is_enabled: dto.is_enabled,
    });

    if (dto.academic_info) {
      const current = await this.repo.findCurrentAcademicInfo(id, schoolId);
      const academicNumbers = await this.resolveAcademicNumbers(
        schoolId,
        dto.academic_info,
        current,
        id,
      );
      await this.repo.upsertAcademicInfo({
        id: generateId(),
        school_id: schoolId,
        student_id: id,
        academic_year_id: dto.academic_info.academic_year_id,
        class_id: dto.academic_info.class_id,
        section_id: dto.academic_info.section_id,
        ...academicNumbers,
        joining_date: dto.academic_info.joining_date,
        is_current: true,
      });
    }

    if (dto.previous_academics) {
      await this.repo.upsertPreviousAcademics({
        id: generateId(),
        school_id: schoolId,
        student_id: id,
        ...dto.previous_academics,
      });
    }

    if (dto.address) {
      await this.repo.upsertAddress({
        id: generateId(),
        school_id: schoolId,
        student_id: id,
        ...dto.address,
      });
    }

    if (dto.hostel_info) {
      await this.repo.upsertHostelInfo({
        id: generateId(),
        school_id: schoolId,
        student_id: id,
        ...dto.hostel_info,
      });
    }

    const parentCredentials =
      dto.parents !== undefined
        ? (await this.saveParents(id, schoolId, dto.parents)).credentials
        : [];

    if (dto.documents !== undefined) {
      const keptLinks = new Set(dto.documents.map((d) => d.document_link));
      const { previousLinks } = await this.repo.replaceDocuments(
        id,
        schoolId,
        dto.documents.map((d) => ({
          id: generateId(),
          school_id: schoolId,
          student_id: id,
          ...d,
          document_name: d.document_name as NewStudentDocument['document_name'],
          file_type: d.file_type as NewStudentDocument['file_type'],
        })),
      );
      await this.uploadsService.deleteByUrls(
        previousLinks.filter((link) => !keptLinks.has(link)),
        schoolId,
      );
    }

    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:${id}*`);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:list:*`);
    await this.redisService.delByPattern(`dashboard:*:${schoolId}:*`);
    await this.redisService.delByPattern(`reports:admin:${schoolId}`);

    return { ...(await this.getFullStudent(id, schoolId)), parent_credentials: parentCredentials };
  }

  // ─── Delete ─────────────────────────────────────────────────────────────────

  async delete(id: string, schoolId: string): Promise<void> {
    const existing = await this.repo.findById(id, schoolId);
    if (!existing) throw new NotFoundException(`Student '${id}' not found`);
    await this.repo.softDelete(id, schoolId);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:${id}*`);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:list:*`);
    await this.redisService.delByPattern(`dashboard:*:${schoolId}:*`);
    await this.redisService.delByPattern(`reports:admin:${schoolId}`);
  }

  // ─── Toggle enable/disable ──────────────────────────────────────────────────

  async toggleEnabled(id: string, schoolId: string, enabled: boolean): Promise<StudentFull> {
    const existing = await this.repo.findById(id, schoolId);
    if (!existing) throw new NotFoundException(`Student '${id}' not found`);
    await this.repo.update(id, schoolId, { is_enabled: enabled });
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:${id}*`);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:list:*`);
    await this.redisService.delByPattern(`dashboard:*:${schoolId}:*`);
    await this.redisService.delByPattern(`reports:admin:${schoolId}`);
    return this.getFullStudent(id, schoolId);
  }

  // ─── Documents ──────────────────────────────────────────────────────────────

  async addDocuments(
    studentId: string,
    schoolId: string,
    documents: StudentDocumentDto[],
    uploadedBy: string,
  ) {
    const existing = await this.repo.findById(studentId, schoolId);
    if (!existing) throw new NotFoundException(`Student '${studentId}' not found`);
    this.assertOwnDocumentLinks(documents, schoolId);

    const docs = await this.repo.addDocuments(
      documents.map((d) => ({
        id: generateId(),
        school_id: schoolId,
        student_id: studentId,
        document_name: d.document_name,
        file_type: d.file_type,
        document_link: d.document_link,
        original_filename: d.original_filename,
        remarks: d.remarks,
        uploaded_by: uploadedBy,
      })),
    );

    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:${studentId}*`);
    return docs;
  }

  async deleteDocument(docId: string, studentId: string, schoolId: string): Promise<void> {
    const link = await this.repo.deleteDocument(docId, studentId, schoolId);
    if (!link) throw new NotFoundException('Document not found');
    await this.uploadsService.deleteByUrls([link], schoolId);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:${studentId}*`);
  }

  // ─── ID Card ────────────────────────────────────────────────────────────────

  async getStudentIdCardData(studentId: string, schoolId: string) {
    const key = `${this.cacheKey(schoolId)}:idcard:${studentId}`;
    return this.redisService.getOrSet(key, REDIS_STUDENT_KEY.CACHE_TTL, async () => {
      const data = await this.repo.findStudentForIdCard(studentId, schoolId);
      if (!data) throw new NotFoundException(`Student '${studentId}' not found`);

      const address = await this.repo.findAddress(studentId, schoolId);
      return { ...data, address };
    });
  }

  async findAllGuardians(schoolId: string, search?: string, studentId?: string) {
    return this.repo.findAllGuardians(schoolId, search, studentId);
  }

  async addGuardian(
    studentId: string,
    schoolId: string,
    data: {
      relation: string;
      first_name: string;
      last_name?: string;
      phone_number: string;
      dial_code?: string;
      email?: string;
      occupation?: string;
      is_primary?: boolean;
      can_pickup?: boolean;
    },
    _createdBy: string,
  ) {
    const student = await this.repo.findById(studentId, schoolId);
    if (!student) throw new NotFoundException(`Student '${studentId}' not found`);
    const parent = await this.repo.addGuardian({
      id: generateId(),
      school_id: schoolId,
      student_id: studentId,
      relation: data.relation as NewStudentParent['relation'],
      first_name: data.first_name,
      last_name: data.last_name,
      phone_number: data.phone_number,
      dial_code: data.dial_code ?? '+91',
      email: data.email,
      occupation: data.occupation,
      is_primary: data.is_primary ?? false,
      can_pickup: data.can_pickup ?? false,
    });
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:${studentId}*`);
    return parent;
  }

  async removeGuardian(guardianId: string, schoolId: string) {
    const guardian = await this.repo.findGuardianById(guardianId, schoolId);
    await this.repo.removeGuardian(guardianId, schoolId);
    if (guardian?.student_id) {
      await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:${guardian.student_id}*`);
    }
  }

  async getPickupCardData(studentId: string, schoolId: string) {
    const key = `${this.cacheKey(schoolId)}:pickup:${studentId}`;
    return this.redisService.getOrSet(key, REDIS_STUDENT_KEY.CACHE_TTL, async () => {
      const { student, parents } = await this.repo.findStudentForPickupCard(studentId, schoolId);
      if (!student) throw new NotFoundException(`Student '${studentId}' not found`);
      return { student, parents };
    });
  }
}
