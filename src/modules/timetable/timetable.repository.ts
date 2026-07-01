import { Injectable, Inject } from '@nestjs/common';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import {
  timetables,
  timetablePeriodTimes,
  timetableEntries,
  timetableClassTeachers,
} from '../../database/drizzle/schema/timetable.schema';
import { classes } from '../../database/drizzle/schema/classes.schema';
import { subjects } from '../../database/drizzle/schema/subjects.schema';
import { schoolUsers } from '../../database/drizzle/schema/school-users.schema';
import {
  Timetable,
  NewTimetable,
  NewTimetablePeriodTime,
  TimetablePeriodTime,
  NewTimetableEntry,
  TimetableEntry,
  NewTimetableClassTeacher,
  TimetableClassTeacher,
} from './types/timetable.types';

@Injectable()
export class TimetableRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  async findAll(schoolId: string, filters: { academic_year_id?: string; class_id?: string }) {
    const conditions = [eq(timetables.school_id, schoolId), eq(timetables.deleted, false)];
    if (filters.academic_year_id)
      conditions.push(eq(timetables.academic_year_id, filters.academic_year_id));
    if (filters.class_id) conditions.push(eq(timetables.class_id, filters.class_id));

    return this.db
      .select({
        id: timetables.id,
        school_id: timetables.school_id,
        academic_year_id: timetables.academic_year_id,
        class_id: timetables.class_id,
        name: timetables.name,
        max_periods: timetables.max_periods,
        is_complete: timetables.is_complete,
        deleted: timetables.deleted,
        created_at: timetables.created_at,
        updated_at: timetables.updated_at,
        class_name: classes.name,
      })
      .from(timetables)
      .leftJoin(classes, eq(timetables.class_id, classes.id))
      .where(and(...conditions))
      .orderBy(timetables.created_at);
  }

  async findById(id: string, schoolId: string) {
    const [row] = await this.db
      .select({
        id: timetables.id,
        school_id: timetables.school_id,
        academic_year_id: timetables.academic_year_id,
        class_id: timetables.class_id,
        name: timetables.name,
        max_periods: timetables.max_periods,
        is_complete: timetables.is_complete,
        deleted: timetables.deleted,
        created_at: timetables.created_at,
        updated_at: timetables.updated_at,
        class_name: classes.name,
      })
      .from(timetables)
      .leftJoin(classes, eq(timetables.class_id, classes.id))
      .where(
        and(
          eq(timetables.id, id),
          eq(timetables.school_id, schoolId),
          eq(timetables.deleted, false),
        ),
      );
    return row;
  }

  async create(data: NewTimetable): Promise<Timetable> {
    const [row] = await this.db.insert(timetables).values(data).returning();
    return row;
  }

  async update(id: string, schoolId: string, data: Partial<NewTimetable>): Promise<Timetable> {
    const [row] = await this.db
      .update(timetables)
      .set({ ...data, updated_at: new Date() })
      .where(and(eq(timetables.id, id), eq(timetables.school_id, schoolId)))
      .returning();
    return row;
  }

  async softDelete(id: string, schoolId: string): Promise<void> {
    await this.db
      .update(timetables)
      .set({ deleted: true, updated_at: new Date() })
      .where(and(eq(timetables.id, id), eq(timetables.school_id, schoolId)));
  }

  // Period times
  async findPeriodTimes(timetableId: string): Promise<TimetablePeriodTime[]> {
    return this.db
      .select()
      .from(timetablePeriodTimes)
      .where(eq(timetablePeriodTimes.timetable_id, timetableId))
      .orderBy(timetablePeriodTimes.period_number);
  }

  async replacePeriodTimes(
    timetableId: string,
    data: NewTimetablePeriodTime[],
  ): Promise<TimetablePeriodTime[]> {
    await this.db
      .delete(timetablePeriodTimes)
      .where(eq(timetablePeriodTimes.timetable_id, timetableId));
    if (!data.length) return [];
    return this.db.insert(timetablePeriodTimes).values(data).returning();
  }

  // Entries
  async findEntries(timetableId: string) {
    return this.db
      .select({
        id: timetableEntries.id,
        timetable_id: timetableEntries.timetable_id,
        school_id: timetableEntries.school_id,
        day_of_week: timetableEntries.day_of_week,
        period_number: timetableEntries.period_number,
        subject_id: timetableEntries.subject_id,
        teacher_id: timetableEntries.teacher_id,
        created_at: timetableEntries.created_at,
        subject_name: subjects.name,
        teacher_name: sql<
          string | null
        >`CASE WHEN ${schoolUsers.id} IS NOT NULL THEN concat(${schoolUsers.first_name}, ' ', ${schoolUsers.last_name}) ELSE NULL END`,
      })
      .from(timetableEntries)
      .leftJoin(subjects, eq(timetableEntries.subject_id, subjects.id))
      .leftJoin(schoolUsers, eq(timetableEntries.teacher_id, schoolUsers.id))
      .where(eq(timetableEntries.timetable_id, timetableId))
      .orderBy(timetableEntries.day_of_week, timetableEntries.period_number);
  }

  async replaceEntries(
    timetableId: string,
    schoolId: string,
    data: Omit<NewTimetableEntry, 'id' | 'school_id' | 'created_at'>[],
  ): Promise<TimetableEntry[]> {
    await this.db.delete(timetableEntries).where(eq(timetableEntries.timetable_id, timetableId));
    if (!data.length) return [];
    const rows = data.map((d) => ({
      ...d,
      id: require('../../utils/uuid.utils').generateId(),
      school_id: schoolId,
      timetable_id: timetableId,
    }));
    return this.db.insert(timetableEntries).values(rows).returning();
  }

  // Class teacher
  async findClassTeacher(timetableId: string) {
    const [row] = await this.db
      .select({
        id: timetableClassTeachers.id,
        timetable_id: timetableClassTeachers.timetable_id,
        teacher_id: timetableClassTeachers.teacher_id,
        teacher_name: sql<
          string | null
        >`CASE WHEN ${schoolUsers.id} IS NOT NULL THEN concat(${schoolUsers.first_name}, ' ', ${schoolUsers.last_name}) ELSE NULL END`,
      })
      .from(timetableClassTeachers)
      .leftJoin(schoolUsers, eq(timetableClassTeachers.teacher_id, schoolUsers.id))
      .where(eq(timetableClassTeachers.timetable_id, timetableId));
    return row ?? null;
  }

  async setClassTeacher(timetableId: string, schoolId: string, teacherId: string) {
    await this.db
      .delete(timetableClassTeachers)
      .where(eq(timetableClassTeachers.timetable_id, timetableId));
    const [row] = await this.db
      .insert(timetableClassTeachers)
      .values({
        id: require('../../utils/uuid.utils').generateId(),
        timetable_id: timetableId,
        school_id: schoolId,
        teacher_id: teacherId,
      })
      .returning();
    return row;
  }

  async clearClassTeacher(timetableId: string): Promise<void> {
    await this.db
      .delete(timetableClassTeachers)
      .where(eq(timetableClassTeachers.timetable_id, timetableId));
  }

  // Employee timetable view - all entries for a teacher
  async findEntriesByTeacher(schoolId: string, teacherId: string) {
    return this.db
      .select({
        timetable_id: timetableEntries.timetable_id,
        day_of_week: timetableEntries.day_of_week,
        period_number: timetableEntries.period_number,
        subject_id: timetableEntries.subject_id,
        teacher_id: timetableEntries.teacher_id,
        subject_name: subjects.name,
        class_name: classes.name,
        timetable_name: timetables.name,
      })
      .from(timetableEntries)
      .innerJoin(
        timetables,
        and(
          eq(timetableEntries.timetable_id, timetables.id),
          eq(timetables.school_id, schoolId),
          eq(timetables.deleted, false),
        ),
      )
      .leftJoin(subjects, eq(timetableEntries.subject_id, subjects.id))
      .leftJoin(classes, eq(timetables.class_id, classes.id))
      .where(
        and(eq(timetableEntries.school_id, schoolId), eq(timetableEntries.teacher_id, teacherId)),
      )
      .orderBy(timetableEntries.day_of_week, timetableEntries.period_number);
  }

  // Busy slots for a set of teachers within an academic year — used by auto-generate
  // to avoid double-booking a teacher across different classes' timetables.
  async findTeacherBusySlots(
    schoolId: string,
    academicYearId: string,
    teacherIds: string[],
  ): Promise<{ teacher_id: string; day_of_week: string; start_time: string; end_time: string }[]> {
    if (teacherIds.length === 0) return [];
    return this.db
      .select({
        teacher_id: sql<string>`${timetableEntries.teacher_id}`,
        day_of_week: timetableEntries.day_of_week,
        start_time: timetablePeriodTimes.start_time,
        end_time: timetablePeriodTimes.end_time,
      })
      .from(timetableEntries)
      .innerJoin(
        timetables,
        and(
          eq(timetables.id, timetableEntries.timetable_id),
          eq(timetables.school_id, schoolId),
          eq(timetables.deleted, false),
        ),
      )
      .innerJoin(
        timetablePeriodTimes,
        and(
          eq(timetablePeriodTimes.timetable_id, timetableEntries.timetable_id),
          eq(timetablePeriodTimes.period_number, timetableEntries.period_number),
        ),
      )
      .where(
        and(
          eq(timetables.academic_year_id, academicYearId),
          inArray(timetableEntries.teacher_id, teacherIds),
        ),
      );
  }

  // Session day view - all timetables for a day
  async findSessionView(
    schoolId: string,
    filters: { day: string; academic_year_id?: string; class_id?: string; timetable_name?: string },
  ) {
    const conditions = [
      eq(timetableEntries.school_id, schoolId),
      eq(timetableEntries.day_of_week, filters.day as any),
      eq(timetables.deleted, false),
    ];
    if (filters.academic_year_id)
      conditions.push(eq(timetables.academic_year_id, filters.academic_year_id));
    if (filters.class_id) conditions.push(eq(timetables.class_id, filters.class_id));
    if (filters.timetable_name) conditions.push(eq(timetables.name, filters.timetable_name));

    return this.db
      .select({
        timetable_id: timetableEntries.timetable_id,
        day_of_week: timetableEntries.day_of_week,
        period_number: timetableEntries.period_number,
        subject_name: subjects.name,
        class_name: classes.name,
        teacher_name: sql<
          string | null
        >`CASE WHEN ${schoolUsers.id} IS NOT NULL THEN concat(${schoolUsers.first_name}, ' ', ${schoolUsers.last_name}) ELSE NULL END`,
        timetable_name: timetables.name,
        start_time: timetablePeriodTimes.start_time,
        end_time: timetablePeriodTimes.end_time,
      })
      .from(timetableEntries)
      .innerJoin(
        timetables,
        and(eq(timetableEntries.timetable_id, timetables.id), eq(timetables.school_id, schoolId)),
      )
      .leftJoin(subjects, eq(timetableEntries.subject_id, subjects.id))
      .leftJoin(schoolUsers, eq(timetableEntries.teacher_id, schoolUsers.id))
      .leftJoin(classes, eq(timetables.class_id, classes.id))
      .leftJoin(
        timetablePeriodTimes,
        and(
          eq(timetablePeriodTimes.timetable_id, timetableEntries.timetable_id),
          eq(timetablePeriodTimes.period_number, timetableEntries.period_number),
        ),
      )
      .where(and(...conditions))
      .orderBy(classes.class_sequence, timetableEntries.period_number);
  }
}
