import { Injectable } from '@nestjs/common';
import { StudentMovementsRepository, NewStudentMovement } from './student-movements.repository';
import { generateId } from '../../utils/uuid.utils';

export interface CreateMovementDto {
  student_id: string;
  date: string;
  tapped_at: string;
  location: 'CAMPUS' | 'LIBRARY' | 'MEDICAL_ROOM' | 'SPORTS' | 'CANTEEN' | 'GATE' | 'HOSTEL' | 'LAB';
  device_id?: string;
}

@Injectable()
export class StudentMovementsService {
  constructor(private readonly repo: StudentMovementsRepository) {}

  async create(dto: CreateMovementDto, schoolId: string) {
    const data: NewStudentMovement = {
      id: generateId(),
      school_id: schoolId,
      student_id: dto.student_id,
      date: dto.date,
      tapped_at: new Date(dto.tapped_at),
      location: dto.location,
      device_id: dto.device_id ?? null,
    };
    return this.repo.create(data);
  }

  async findAll(schoolId: string, filters: { student_id?: string; date?: string } = {}) {
    return this.repo.findAll(schoolId, filters);
  }

  async findByStudent(studentId: string, schoolId: string, date?: string) {
    return this.repo.findByStudent(studentId, schoolId, date);
  }

  async remove(id: string, schoolId: string) {
    await this.repo.delete(id, schoolId);
  }
}
