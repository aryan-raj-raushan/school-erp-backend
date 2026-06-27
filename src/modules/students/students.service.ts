import { Injectable, NotFoundException } from '@nestjs/common';
import { StudentsRepository } from './students.repository';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { CreateStudentDto, StudentDocumentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import {
  StudentFull,
  StudentFilters,
  StudentListItem,
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
  ) {}

  private cacheKey(schoolId: string) {
    return REDIS_STUDENT_KEY.STUDENT(schoolId);
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

  async create(dto: CreateStudentDto, schoolId: string, createdBy: string): Promise<StudentFull> {
    const systemNumber = await this.repo.nextSystemNumber(schoolId);
    const studentId = generateId();

    const student = await this.repo.create({
      id: studentId,
      school_id: schoolId,
      system_number: systemNumber,
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

    const [academicInfo, previousAcademics, address, hostelInfo, parents, documents] =
      await Promise.all([
        dto.academic_info
          ? this.repo.upsertAcademicInfo({
              id: generateId(),
              school_id: schoolId,
              student_id: studentId,
              academic_year_id: dto.academic_info.academic_year_id,
              class_id: dto.academic_info.class_id,
              section_id: dto.academic_info.section_id,
              admission_number: dto.academic_info.admission_number,
              registration_number: dto.academic_info.registration_number,
              roll_number: dto.academic_info.roll_number,
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

        dto.parents?.length
          ? this.repo.replaceParents(
              studentId,
              schoolId,
              dto.parents.map((p) => ({
                id: generateId(),
                school_id: schoolId,
                student_id: studentId,
                ...p,
                relation: p.relation as NewStudentParent['relation'],
                qualification: p.qualification as NewStudentParent['qualification'],
              })),
            )
          : Promise.resolve([]),

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
      parents,
      documents,
    };
  }

  // ─── Update ─────────────────────────────────────────────────────────────────

  async update(id: string, schoolId: string, dto: UpdateStudentDto): Promise<StudentFull> {
    // Ensure student exists
    const existing = await this.repo.findById(id, schoolId);
    if (!existing) throw new NotFoundException(`Student '${id}' not found`);

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
      await this.repo.upsertAcademicInfo({
        id: generateId(),
        school_id: schoolId,
        student_id: id,
        academic_year_id: dto.academic_info.academic_year_id,
        class_id: dto.academic_info.class_id,
        section_id: dto.academic_info.section_id,
        admission_number: dto.academic_info.admission_number,
        registration_number: dto.academic_info.registration_number,
        roll_number: dto.academic_info.roll_number,
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

    if (dto.parents !== undefined) {
      await this.repo.replaceParents(
        id,
        schoolId,
        dto.parents.map((p) => ({
          id: generateId(),
          school_id: schoolId,
          student_id: id,
          ...p,
          relation: p.relation as NewStudentParent['relation'],
          qualification: p.qualification as NewStudentParent['qualification'],
        })),
      );
    }

    if (dto.documents !== undefined) {
      await this.repo.replaceDocuments(
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
    }

    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:${id}*`);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:list:*`);
    await this.redisService.delByPattern(`dashboard:*:${schoolId}:*`);
    await this.redisService.delByPattern(`reports:admin:${schoolId}`);

    return this.getFullStudent(id, schoolId);
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
    await this.repo.deleteDocument(docId, studentId, schoolId);
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

  async findAllGuardians(schoolId: string, search?: string) {
    return this.repo.findAllGuardians(schoolId, search);
  }

  async addGuardian(studentId: string, schoolId: string, data: {
    relation: string; first_name: string; last_name?: string;
    phone_number: string; dial_code?: string; email?: string;
    occupation?: string; is_primary?: boolean; can_pickup?: boolean;
  }, createdBy: string) {
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
