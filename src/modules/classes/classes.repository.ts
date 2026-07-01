import { Injectable, Inject } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { classes } from '../../database/drizzle/schema/classes.schema';
import { sections } from '../../database/drizzle/schema/sections.schema';
import { schoolUsers } from '../../database/drizzle/schema/school-users.schema';
import { academicYears } from '../../database/drizzle/schema/academic-years.schema';
import { subjectClasses } from '../../database/drizzle/schema/subject-classes.schema';
import { classTimingOverrides } from '../../database/drizzle/schema/school-settings.schema';
import { Class, NewClass, ClassSectionView } from './types/class.types';
import { ClassFilterDto } from './dto/class-filter.dto';

@Injectable()
export class ClassesRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  private buildConditions(schoolId: string, filters: Partial<ClassFilterDto> = {}) {
    const conditions = [
      eq(sections.school_id, schoolId),
      eq(sections.deleted, false),
      eq(classes.deleted, false),
    ];
    if (filters.academic_year_id) {
      conditions.push(eq(classes.academic_year_id, filters.academic_year_id));
    } else {
      // Default to current academic year when none specified
      conditions.push(eq(academicYears.is_current, true));
    }
    if (filters.department) conditions.push(eq(classes.department, filters.department));
    if (filters.class_type) conditions.push(eq(classes.class_type, filters.class_type));
    return conditions;
  }

  private classSelect() {
    return {
      id: sections.id,
      class_id: sections.class_id,
      class_name: classes.name,
      section_name: sections.name,
      department: classes.department,
      class_type: classes.class_type,
      class_sequence: classes.class_sequence,
      no_of_sessions: classes.no_of_sessions,
      class_code: classes.class_code,
      default_sections: classes.default_sections,
      numeric_value: classes.numeric_value,
      school_id: sections.school_id,
      academic_year_id: classes.academic_year_id,
      class_teacher_id: sections.class_teacher_id,
      class_teacher_name: sql<string | null>`CASE WHEN ${schoolUsers.id} IS NOT NULL THEN concat(${schoolUsers.first_name}, ' ', ${schoolUsers.last_name}) ELSE NULL END`,
      room_number: sections.room_number,
      student_capacity: sections.max_strength,
      is_active: sections.is_active,
      deleted: sections.deleted,
      created_at: sections.created_at,
      updated_at: sections.updated_at,
    };
  }

  async findAll(schoolId: string, filters: ClassFilterDto): Promise<ClassSectionView[]> {
    const limit = filters.limit ?? 20;
    const offset = ((filters.page ?? 1) - 1) * limit;

    const rows = await this.db
      .select(this.classSelect())
      .from(sections)
      .innerJoin(classes, eq(sections.class_id, classes.id))
      .leftJoin(schoolUsers, eq(sections.class_teacher_id, schoolUsers.id))
      .leftJoin(academicYears, eq(classes.academic_year_id, academicYears.id))
      .where(and(...this.buildConditions(schoolId, filters)))
      .orderBy(classes.class_sequence, classes.numeric_value, sections.name)
      .limit(limit)
      .offset(offset);

    return rows.map((r) => ({ ...r, display_name: `${r.class_name} ${r.section_name}` }));
  }

  async count(schoolId: string, filters: ClassFilterDto): Promise<number> {
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(sections)
      .innerJoin(classes, eq(sections.class_id, classes.id))
      .leftJoin(academicYears, eq(classes.academic_year_id, academicYears.id))
      .where(and(...this.buildConditions(schoolId, filters)));
    return Number(count);
  }

  async findById(id: string, schoolId: string): Promise<Class | undefined> {
    const [row] = await this.db
      .select()
      .from(classes)
      .where(
        and(
          eq(classes.id, id),
          eq(classes.school_id, schoolId),
          eq(classes.deleted, false),
        ),
      );
    return row;
  }

  async create(data: NewClass): Promise<Class> {
    const [row] = await this.db.insert(classes).values(data).returning();
    return row;
  }

  async update(id: string, schoolId: string, data: Partial<NewClass>): Promise<Class> {
    const [row] = await this.db
      .update(classes)
      .set({ ...data, updated_at: new Date() })
      .where(and(eq(classes.id, id), eq(classes.school_id, schoolId)))
      .returning();
    return row;
  }

  async softDelete(id: string, schoolId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .update(classes)
        .set({ deleted: true, is_active: false, updated_at: new Date() })
        .where(and(eq(classes.id, id), eq(classes.school_id, schoolId)));

      // Sections have no meaning without their parent class — cascade the soft delete
      // so they stop appearing in section pickers (students, attendance, RFID, etc.)
      await tx
        .update(sections)
        .set({ deleted: true, is_active: false, updated_at: new Date() })
        .where(and(eq(sections.class_id, id), eq(sections.school_id, schoolId)));

      // Pure mapping tables — remove rows referencing the deleted class rather than
      // leaving them orphaned (they have no soft-delete flag of their own).
      await tx.delete(subjectClasses).where(eq(subjectClasses.class_id, id));
      await tx
        .delete(classTimingOverrides)
        .where(and(eq(classTimingOverrides.class_id, id), eq(classTimingOverrides.school_id, schoolId)));
    });
  }
}
