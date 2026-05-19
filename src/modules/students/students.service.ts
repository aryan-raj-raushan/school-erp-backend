import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { StudentsRepository } from './students.repository';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { PaginationResponse } from '../../shared/responses/api-response';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentFilterDto } from './dto/student-filter.dto';
import { CreateDocumentDto } from './dto/create-document.dto';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
import { Student, StudentDocument, StudentParent } from './types/student.types';

const LIST_TTL = 120;
const ITEM_TTL = 300;

@Injectable()
export class StudentsService {
  constructor(
    private readonly studentsRepo: StudentsRepository,
    private readonly redisService: RedisService,
  ) {}

  async findAll(schoolId: string, filters: StudentFilterDto): Promise<PaginationResponse<Student>> {
    const cacheKey = `students:${schoolId}:list:${JSON.stringify(filters)}`;
    return this.redisService.getOrSet(cacheKey, LIST_TTL, async () => {
      const [items, total] = await Promise.all([
        this.studentsRepo.findAll(schoolId, filters),
        this.studentsRepo.count(schoolId, filters),
      ]);
      return PaginationResponse.of(items, total, filters);
    });
  }

  async findById(id: string, schoolId: string): Promise<Student> {
    const cacheKey = `students:${schoolId}:${id}`;
    return this.redisService.getOrSet(cacheKey, ITEM_TTL, async () => {
      const student = await this.studentsRepo.findById(id, schoolId);
      if (!student) throw new NotFoundException(`Student with id '${id}' not found`);
      return student;
    });
  }

  async create(schoolId: string, dto: CreateStudentDto, createdBy: string): Promise<Student> {
    const existing = await this.studentsRepo.findByAdmissionNumber(schoolId, dto.admission_number);
    if (existing) {
      throw new ConflictException(
        `Student with admission number '${dto.admission_number}' already exists in this school`,
      );
    }

    const student = await this.studentsRepo.create({
      id: generateId(),
      school_id: schoolId,
      created_by: createdBy,
      ...dto,
    });

    await this.redisService.delByPattern(`students:${schoolId}:list:*`);
    return student;
  }

  async update(id: string, schoolId: string, dto: UpdateStudentDto): Promise<Student> {
    await this.findById(id, schoolId);

    const updated = await this.studentsRepo.update(id, schoolId, dto);
    await this.redisService.delByPattern(`students:${schoolId}:*`);
    return updated;
  }

  async remove(id: string, schoolId: string): Promise<void> {
    await this.findById(id, schoolId);
    await this.studentsRepo.softDelete(id, schoolId);
    await this.redisService.delByPattern(`students:${schoolId}:*`);
  }

  // Documents

  async getDocuments(studentId: string, schoolId: string): Promise<StudentDocument[]> {
    await this.findById(studentId, schoolId);
    return this.studentsRepo.findDocuments(studentId, schoolId);
  }

  async addDocument(
    studentId: string,
    schoolId: string,
    dto: CreateDocumentDto,
    uploadedBy: string,
  ): Promise<StudentDocument> {
    await this.findById(studentId, schoolId);

    return this.studentsRepo.createDocument({
      id: generateId(),
      school_id: schoolId,
      student_id: studentId,
      uploaded_by: uploadedBy,
      ...dto,
    });
  }

  async removeDocument(docId: string, studentId: string, schoolId: string): Promise<void> {
    await this.findById(studentId, schoolId);
    const doc = await this.studentsRepo.findDocumentById(docId, studentId, schoolId);
    if (!doc) throw new NotFoundException(`Document with id '${docId}' not found`);
    await this.studentsRepo.softDeleteDocument(docId, studentId, schoolId);
  }

  // Parents

  async getParents(studentId: string, schoolId: string): Promise<StudentParent[]> {
    await this.findById(studentId, schoolId);
    return this.studentsRepo.findParents(studentId, schoolId);
  }

  async addParent(studentId: string, schoolId: string, dto: CreateParentDto): Promise<StudentParent> {
    await this.findById(studentId, schoolId);

    return this.studentsRepo.createParent({
      id: generateId(),
      school_id: schoolId,
      student_id: studentId,
      ...dto,
    });
  }

  async updateParent(
    parentId: string,
    studentId: string,
    schoolId: string,
    dto: UpdateParentDto,
  ): Promise<StudentParent> {
    await this.findById(studentId, schoolId);
    const parent = await this.studentsRepo.findParentById(parentId, studentId, schoolId);
    if (!parent) throw new NotFoundException(`Parent with id '${parentId}' not found`);
    return this.studentsRepo.updateParent(parentId, studentId, schoolId, dto);
  }

  async removeParent(parentId: string, studentId: string, schoolId: string): Promise<void> {
    await this.findById(studentId, schoolId);
    const parent = await this.studentsRepo.findParentById(parentId, studentId, schoolId);
    if (!parent) throw new NotFoundException(`Parent with id '${parentId}' not found`);
    await this.studentsRepo.softDeleteParent(parentId, studentId, schoolId);
  }
}
