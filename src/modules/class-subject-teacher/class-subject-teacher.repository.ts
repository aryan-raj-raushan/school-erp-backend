import { Injectable, Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { classSubjectTeachers } from '../../database/drizzle/schema/class-subject-teachers.schema';
import { subjects } from '../../database/drizzle/schema/subjects.schema';
import { schoolUsers } from '../../database/drizzle/schema/school-users.schema';
import {
  ClassSubjectTeacher,
  ClassSubjectTeacherWithNames,
  NewClassSubjectTeacher,
} from './types/class-subject-teacher.types';
import { generateId } from '../../utils/uuid.utils';

@Injectable()
export class ClassSubjectTeacherRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  async findForClass(
    schoolId: string,
    academicYearId: string,
    classId: string,
  ): Promise<ClassSubjectTeacherWithNames[]> {
    const rows = await this.db
      .select({
        mapping: classSubjectTeachers,
        subject_name: subjects.name,
        teacher_first_name: schoolUsers.first_name,
        teacher_last_name: schoolUsers.last_name,
      })
      .from(classSubjectTeachers)
      .innerJoin(subjects, eq(subjects.id, classSubjectTeachers.subject_id))
      .innerJoin(schoolUsers, eq(schoolUsers.id, classSubjectTeachers.teacher_id))
      .where(
        and(
          eq(classSubjectTeachers.school_id, schoolId),
          eq(classSubjectTeachers.academic_year_id, academicYearId),
          eq(classSubjectTeachers.class_id, classId),
          eq(classSubjectTeachers.is_active, true),
          eq(classSubjectTeachers.deleted, false),
        ),
      )
      .orderBy(subjects.display_order, subjects.name);

    return rows.map((r) => ({
      ...r.mapping,
      subject_name: r.subject_name,
      teacher_name: [r.teacher_first_name, r.teacher_last_name].filter(Boolean).join(' '),
    }));
  }

  async replaceForClass(
    schoolId: string,
    academicYearId: string,
    classId: string,
    mappings: { subject_id: string; teacher_id: string }[],
    createdBy: string,
  ): Promise<ClassSubjectTeacher[]> {
    return this.db.transaction(async (tx) => {
      await tx
        .delete(classSubjectTeachers)
        .where(
          and(
            eq(classSubjectTeachers.school_id, schoolId),
            eq(classSubjectTeachers.academic_year_id, academicYearId),
            eq(classSubjectTeachers.class_id, classId),
          ),
        );

      if (mappings.length === 0) return [];

      const values: NewClassSubjectTeacher[] = mappings.map((m) => ({
        id: generateId(),
        school_id: schoolId,
        academic_year_id: academicYearId,
        class_id: classId,
        subject_id: m.subject_id,
        teacher_id: m.teacher_id,
        created_by: createdBy,
      }));

      return tx.insert(classSubjectTeachers).values(values).returning();
    });
  }

  async remove(id: string, schoolId: string): Promise<void> {
    await this.db
      .update(classSubjectTeachers)
      .set({ deleted: true, is_active: false, updated_at: new Date() })
      .where(and(eq(classSubjectTeachers.id, id), eq(classSubjectTeachers.school_id, schoolId)));
  }
}
