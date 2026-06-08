import { Injectable, NotFoundException } from '@nestjs/common';
import { TimetableRepository } from './timetable.repository';
import { generateId } from '../../utils/uuid.utils';
import { CreateTimetableDto } from './dto/create-timetable.dto';
import { TimetableFull } from './types/timetable.types';

@Injectable()
export class TimetableService {
  constructor(private readonly repo: TimetableRepository) {}

  async findAll(schoolId: string, filters: { academic_year_id?: string; class_id?: string; class_detail_id?: string }) {
    return this.repo.findAll(schoolId, filters);
  }

  async findById(id: string, schoolId: string): Promise<TimetableFull> {
    const timetable = await this.repo.findById(id, schoolId);
    if (!timetable) throw new NotFoundException(`Timetable '${id}' not found`);
    const [period_times, entries, class_teacher] = await Promise.all([
      this.repo.findPeriodTimes(id),
      this.repo.findEntries(id),
      this.repo.findClassTeacher(id),
    ]);
    return { timetable, period_times, entries, class_teacher };
  }

  async create(dto: CreateTimetableDto, schoolId: string): Promise<TimetableFull> {
    const id = generateId();
    const timetable = await this.repo.create({
      id, school_id: schoolId,
      academic_year_id: dto.academic_year_id,
      class_id: dto.class_id,
      class_detail_id: dto.class_detail_id,
      name: dto.name ?? 'DEFAULT',
      max_periods: dto.max_periods ?? 8,
      is_complete: dto.is_complete ?? false,
    });

    const period_times = dto.period_times?.length
      ? await this.repo.replacePeriodTimes(id, dto.period_times.map((p) => ({ id: generateId(), timetable_id: id, ...p })))
      : [];

    const entries = dto.entries?.length
      ? await this.repo.replaceEntries(id, schoolId, dto.entries.map((e) => ({
          timetable_id: id,
          day_of_week: e.day_of_week as any,
          period_number: e.period_number,
          subject_id: e.subject_id,
          teacher_id: e.teacher_id,
        })))
      : [];

    let class_teacher = null;
    if (dto.class_teacher_id) {
      await this.repo.setClassTeacher(id, schoolId, dto.class_teacher_id);
      class_teacher = await this.repo.findClassTeacher(id);
    }

    return { timetable, period_times, entries, class_teacher };
  }

  async update(id: string, schoolId: string, dto: Partial<CreateTimetableDto>): Promise<TimetableFull> {
    await this.repo.findById(id, schoolId).then((t) => { if (!t) throw new NotFoundException(`Timetable '${id}' not found`); });

    const timetable = await this.repo.update(id, schoolId, {
      academic_year_id: dto.academic_year_id,
      class_id: dto.class_id,
      class_detail_id: dto.class_detail_id,
      name: dto.name,
      max_periods: dto.max_periods,
      is_complete: dto.is_complete,
    });

    const period_times = dto.period_times !== undefined
      ? await this.repo.replacePeriodTimes(id, dto.period_times.map((p) => ({ id: generateId(), timetable_id: id, ...p })))
      : await this.repo.findPeriodTimes(id);

    const entries = dto.entries !== undefined
      ? await this.repo.replaceEntries(id, schoolId, dto.entries.map((e) => ({
          timetable_id: id,
          day_of_week: e.day_of_week as any,
          period_number: e.period_number,
          subject_id: e.subject_id,
          teacher_id: e.teacher_id,
        })))
      : await this.repo.findEntries(id);

    if (dto.class_teacher_id !== undefined) {
      if (dto.class_teacher_id) {
        await this.repo.setClassTeacher(id, schoolId, dto.class_teacher_id);
      } else {
        await this.repo.clearClassTeacher(id);
      }
    }
    const class_teacher = await this.repo.findClassTeacher(id);

    return { timetable, period_times, entries, class_teacher };
  }

  async remove(id: string, schoolId: string): Promise<void> {
    await this.repo.findById(id, schoolId).then((t) => { if (!t) throw new NotFoundException(`Timetable '${id}' not found`); });
    await this.repo.softDelete(id, schoolId);
  }

  async getEmployeeTimetable(schoolId: string, teacherId: string) {
    return this.repo.findEntriesByTeacher(schoolId, teacherId);
  }

  async getSessionView(schoolId: string, filters: { day: string; academic_year_id?: string; class_id?: string }) {
    return this.repo.findSessionView(schoolId, filters);
  }
}
