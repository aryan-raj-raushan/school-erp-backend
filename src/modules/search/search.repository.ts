import { Injectable, Inject } from '@nestjs/common';
import { and, eq, ilike, or, SQL } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import {
  students,
  studentAcademicInfo,
  classes,
  sections,
  schoolUsers,
  parents,
  admissionEnquiries,
  subjects,
  feeTypes,
  schoolEvents,
  academicYears,
  homeworks,
} from '../../database/drizzle/schema';
import { SearchResultItem } from './types/search.types';

const LIMIT = 5;

@Injectable()
export class SearchRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  async searchStudents(t: string, schoolId: string): Promise<SearchResultItem[]> {
    const rows = await this.db
      .select({
        id: students.id,
        first_name: students.first_name,
        last_name: students.last_name,
        phone_number: students.phone_number,
        email: students.email,
        class_name: classes.name,
        section_name: sections.name,
      })
      .from(students)
      .leftJoin(
        studentAcademicInfo,
        and(
          eq(studentAcademicInfo.student_id, students.id),
          eq(studentAcademicInfo.is_current, true),
        ),
      )
      .leftJoin(classes, eq(studentAcademicInfo.class_id, classes.id))
      .leftJoin(sections, eq(studentAcademicInfo.section_id, sections.id))
      .where(
        and(
          eq(students.school_id, schoolId),
          eq(students.deleted, false),
          or(
            ilike(students.first_name, t),
            ilike(students.last_name, t),
            ilike(students.phone_number, t),
            ilike(students.email, t),
          ) as SQL,
        ),
      )
      .limit(LIMIT);

    return rows.map((r) => ({
      id: r.id,
      type: 'student' as const,
      name: [r.first_name, r.last_name].filter(Boolean).join(' '),
      subtitle: r.phone_number ?? r.email ?? '',
      meta:
        r.class_name && r.section_name
          ? `${r.class_name} · ${r.section_name}`
          : (r.class_name ?? undefined),
    }));
  }

  async searchStaff(t: string, schoolId: string): Promise<SearchResultItem[]> {
    const rows = await this.db
      .select({
        id: schoolUsers.id,
        first_name: schoolUsers.first_name,
        last_name: schoolUsers.last_name,
        phone_number: schoolUsers.phone_number,
        email: schoolUsers.email,
        role: schoolUsers.role,
      })
      .from(schoolUsers)
      .where(
        and(
          eq(schoolUsers.school_id, schoolId),
          eq(schoolUsers.deleted, false),
          or(
            ilike(schoolUsers.first_name, t),
            ilike(schoolUsers.last_name, t),
            ilike(schoolUsers.phone_number, t),
            ilike(schoolUsers.email, t),
          ) as SQL,
        ),
      )
      .limit(LIMIT);

    return rows.map((r) => ({
      id: r.id,
      type: 'staff' as const,
      name: [r.first_name, r.last_name].filter(Boolean).join(' '),
      subtitle: r.phone_number ?? r.email ?? '',
      meta: r.role ?? undefined,
    }));
  }

  async searchParents(t: string, schoolId: string): Promise<SearchResultItem[]> {
    const rows = await this.db
      .select({
        id: parents.id,
        first_name: parents.first_name,
        last_name: parents.last_name,
        phone_number: parents.phone_number,
        email: parents.email,
      })
      .from(parents)
      .where(
        and(
          eq(parents.school_id, schoolId),
          eq(parents.deleted, false),
          or(
            ilike(parents.first_name, t),
            ilike(parents.last_name, t),
            ilike(parents.phone_number, t),
          ) as SQL,
        ),
      )
      .limit(LIMIT);

    return rows.map((r) => ({
      id: r.id,
      type: 'parent' as const,
      name: [r.first_name, r.last_name].filter(Boolean).join(' '),
      subtitle: r.phone_number ?? r.email ?? '',
    }));
  }

  async searchAdmissions(t: string, schoolId: string): Promise<SearchResultItem[]> {
    const rows = await this.db
      .select({
        id: admissionEnquiries.id,
        student_name: admissionEnquiries.student_name,
        phone: admissionEnquiries.phone,
        status: admissionEnquiries.status,
      })
      .from(admissionEnquiries)
      .where(
        and(
          eq(admissionEnquiries.school_id, schoolId),
          eq(admissionEnquiries.deleted, false),
          or(ilike(admissionEnquiries.student_name, t), ilike(admissionEnquiries.phone, t)) as SQL,
        ),
      )
      .limit(LIMIT);

    return rows.map((r) => ({
      id: r.id,
      type: 'admission' as const,
      name: r.student_name,
      subtitle: r.phone ?? '',
      meta: r.status ?? undefined,
    }));
  }

  async searchClasses(t: string, schoolId: string): Promise<SearchResultItem[]> {
    const rows = await this.db
      .select({ id: classes.id, name: classes.name })
      .from(classes)
      .where(
        and(eq(classes.school_id, schoolId), eq(classes.deleted, false), ilike(classes.name, t)),
      )
      .limit(LIMIT);

    return rows.map((r) => ({ id: r.id, type: 'class' as const, name: r.name, subtitle: 'Class' }));
  }

  async searchSubjects(t: string, schoolId: string): Promise<SearchResultItem[]> {
    const rows = await this.db
      .select({ id: subjects.id, name: subjects.name })
      .from(subjects)
      .where(
        and(eq(subjects.school_id, schoolId), eq(subjects.deleted, false), ilike(subjects.name, t)),
      )
      .limit(LIMIT);

    return rows.map((r) => ({
      id: r.id,
      type: 'subject' as const,
      name: r.name,
      subtitle: 'Subject',
    }));
  }

  async searchFeeTypes(t: string, schoolId: string): Promise<SearchResultItem[]> {
    const rows = await this.db
      .select({ id: feeTypes.id, name: feeTypes.name })
      .from(feeTypes)
      .where(
        and(eq(feeTypes.school_id, schoolId), eq(feeTypes.deleted, false), ilike(feeTypes.name, t)),
      )
      .limit(LIMIT);

    return rows.map((r) => ({
      id: r.id,
      type: 'fee_type' as const,
      name: r.name,
      subtitle: 'Fee Type',
    }));
  }

  async searchEvents(t: string, schoolId: string): Promise<SearchResultItem[]> {
    const rows = await this.db
      .select({ id: schoolEvents.id, name: schoolEvents.name, type: schoolEvents.type })
      .from(schoolEvents)
      .where(
        and(
          eq(schoolEvents.school_id, schoolId),
          eq(schoolEvents.deleted, false),
          ilike(schoolEvents.name, t),
        ),
      )
      .limit(LIMIT);

    return rows.map((r) => ({
      id: r.id,
      type: 'event' as const,
      name: r.name,
      subtitle: r.type === 'HOLIDAY' ? 'Holiday' : 'Event',
    }));
  }

  async searchAcademicYears(t: string, schoolId: string): Promise<SearchResultItem[]> {
    const rows = await this.db
      .select({
        id: academicYears.id,
        name: academicYears.name,
        is_active: academicYears.is_active,
      })
      .from(academicYears)
      .where(and(eq(academicYears.school_id, schoolId), ilike(academicYears.name, t)))
      .limit(LIMIT);

    return rows.map((r) => ({
      id: r.id,
      type: 'academic_year' as const,
      name: r.name,
      subtitle: r.is_active ? 'Current Year' : 'Academic Year',
    }));
  }

  async searchHomework(t: string, schoolId: string): Promise<SearchResultItem[]> {
    const rows = await this.db
      .select({ id: homeworks.id, title: homeworks.title, status: homeworks.status })
      .from(homeworks)
      .where(
        and(
          eq(homeworks.school_id, schoolId),
          eq(homeworks.deleted, false),
          ilike(homeworks.title, t),
        ),
      )
      .limit(LIMIT);

    return rows.map((r) => ({
      id: r.id,
      type: 'homework' as const,
      name: r.title,
      subtitle: 'Homework',
      meta: r.status ?? undefined,
    }));
  }
}
