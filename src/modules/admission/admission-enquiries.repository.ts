import { Injectable, Inject } from '@nestjs/common';
import { eq, and, or, ilike, sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { admissionEnquiries } from '../../database/drizzle/schema/admission-enquiries.schema';
import { enquiryHistory } from '../../database/drizzle/schema/enquiry-history.schema';
import {
  AdmissionEnquiry,
  NewAdmissionEnquiry,
  EnquiryHistory,
  NewEnquiryHistory,
} from './types/admission-enquiry.types';
import { FilterAdmissionEnquiryDto } from './dto/filter-admission-enquiry.dto';

@Injectable()
export class AdmissionEnquiriesRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  private buildConditions(schoolId: string, filters: FilterAdmissionEnquiryDto) {
    const conditions = [
      eq(admissionEnquiries.school_id, schoolId),
      eq(admissionEnquiries.deleted, false),
    ];

    if (filters.academic_year_id) {
      conditions.push(eq(admissionEnquiries.academic_year_id, filters.academic_year_id));
    }
    if (filters.applying_class_id) {
      conditions.push(eq(admissionEnquiries.applying_class_id, filters.applying_class_id));
    }
    if (filters.status) {
      conditions.push(eq(admissionEnquiries.status, filters.status));
    }
    if (filters.assigned_teacher_id) {
      conditions.push(eq(admissionEnquiries.assigned_teacher_id, filters.assigned_teacher_id));
    }
    if (filters.enquiry_source_id) {
      conditions.push(eq(admissionEnquiries.enquiry_source_id, filters.enquiry_source_id));
    }
    // New: filter by next follow-up date
    if (filters.next_followup_date) {
      conditions.push(eq(admissionEnquiries.next_followup_date, filters.next_followup_date));
    }

    return conditions;
  }

  async findAll(schoolId: string, filters: FilterAdmissionEnquiryDto): Promise<AdmissionEnquiry[]> {
    const conditions = this.buildConditions(schoolId, filters);
    const limit = filters.limit ?? 20;
    const offset = ((filters.page ?? 1) - 1) * limit;

    if (filters.search) {
      const term = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(admissionEnquiries.student_name, term),
          ilike(admissionEnquiries.phone, term),
        )!,
      );
    }

    return this.db
      .select()
      .from(admissionEnquiries)
      .where(and(...conditions))
      .orderBy(admissionEnquiries.created_at)
      .limit(limit)
      .offset(offset);
  }

  async count(schoolId: string, filters: FilterAdmissionEnquiryDto): Promise<number> {
    const conditions = this.buildConditions(schoolId, filters);

    if (filters.search) {
      const term = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(admissionEnquiries.student_name, term),
          ilike(admissionEnquiries.phone, term),
        )!,
      );
    }

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(admissionEnquiries)
      .where(and(...conditions));
    return Number(count);
  }

  async findById(id: string, schoolId: string): Promise<AdmissionEnquiry | undefined> {
    const [row] = await this.db
      .select()
      .from(admissionEnquiries)
      .where(and(
        eq(admissionEnquiries.id, id),
        eq(admissionEnquiries.school_id, schoolId),
        eq(admissionEnquiries.deleted, false),
      ));
    return row;
  }

  async create(data: NewAdmissionEnquiry): Promise<AdmissionEnquiry> {
    const [row] = await this.db.insert(admissionEnquiries).values(data).returning();
    return row;
  }

  async update(
    id: string,
    schoolId: string,
    data: Partial<NewAdmissionEnquiry>,
  ): Promise<AdmissionEnquiry> {
    const [row] = await this.db
      .update(admissionEnquiries)
      .set({ ...data, updated_at: new Date() })
      .where(and(eq(admissionEnquiries.id, id), eq(admissionEnquiries.school_id, schoolId)))
      .returning();
    return row;
  }

  async softDelete(id: string, schoolId: string): Promise<void> {
    await this.db
      .update(admissionEnquiries)
      .set({ deleted: true, is_active: false, updated_at: new Date() })
      .where(and(eq(admissionEnquiries.id, id), eq(admissionEnquiries.school_id, schoolId)));
  }

  // ─── History ────────────────────────────────────────

  async createHistory(data: NewEnquiryHistory): Promise<EnquiryHistory> {
    const [row] = await this.db.insert(enquiryHistory).values(data).returning();
    return row;
  }

  async findHistoryByEnquiryId(
    enquiryId: string,
    schoolId: string,
  ): Promise<EnquiryHistory[]> {
    return this.db
      .select()
      .from(enquiryHistory)
      .where(and(
        eq(enquiryHistory.enquiry_id, enquiryId),
        eq(enquiryHistory.school_id, schoolId),
      ))
      .orderBy(enquiryHistory.created_at);
  }
}