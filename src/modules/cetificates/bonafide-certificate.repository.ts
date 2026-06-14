import { Injectable, Inject } from '@nestjs/common';
import { and, eq, ilike, or, desc, sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import * as schema from '../../database/drizzle/schema';
import {
  NewBonafideCertificate,
  BonafideCertificate,
  BonafideCertificateListRow,
  BonafideCertificateDetailRow,
} from './types/certificates.types';
import { BonafideCertificateFilterDto } from './dto/certificates.dto';
import { bonafideCertificates } from '@database/drizzle/schema/certificates.schema';

@Injectable()
export class BonafideCertificateRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  // ─── Private helpers ───────────────────────────────────────────────────────

  private buildBaseConditions(schoolId: string, filters: BonafideCertificateFilterDto) {
    const conditions = [
      eq(bonafideCertificates.school_id, schoolId),
      eq(bonafideCertificates.deleted, false),
    ];

    if (filters.academic_year_id) {
      conditions.push(eq(bonafideCertificates.academic_year_id, filters.academic_year_id));
    }
    if (filters.class_id) {
      conditions.push(eq(bonafideCertificates.class_id, filters.class_id));
    }
    if (filters.section_id) {
      conditions.push(eq(bonafideCertificates.section_id, filters.section_id));
    }
    if (filters.status) {
      conditions.push(eq(bonafideCertificates.status, filters.status as any));
    }

    return conditions;
  }

  // ─── Queries ───────────────────────────────────────────────────────────────

  async findAll(
    schoolId: string,
    filters: BonafideCertificateFilterDto,
  ): Promise<BonafideCertificateListRow[]> {
    const conditions = this.buildBaseConditions(schoolId, filters);
    const limit = filters.limit ?? 20;
    const offset = ((filters.page ?? 1) - 1) * limit;

    const rows = await this.db
      .select({
        id: bonafideCertificates.id,
        reference_no: bonafideCertificates.reference_no,
        purpose: bonafideCertificates.purpose,
        status: bonafideCertificates.status,
        pdf_url: bonafideCertificates.pdf_url,
        created_at: bonafideCertificates.created_at,
        student_first_name: schema.students.first_name,
        student_last_name: schema.students.last_name,
        class_name: schema.classes.name,
        section_name: schema.sections.name,
        academic_year_name: schema.academicYears.name,
      })
      .from(bonafideCertificates)
      .innerJoin(schema.students, eq(bonafideCertificates.student_id, schema.students.id))
      .leftJoin(schema.classes, eq(bonafideCertificates.class_id, schema.classes.id))
      .leftJoin(schema.sections, eq(bonafideCertificates.section_id, schema.sections.id))
      .leftJoin(
        schema.academicYears,
        eq(bonafideCertificates.academic_year_id, schema.academicYears.id),
      )
      .where(
        filters.search
          ? and(
              ...conditions,
              or(
                ilike(schema.students.first_name, `%${filters.search}%`),
                ilike(schema.students.last_name, `%${filters.search}%`),
                ilike(bonafideCertificates.reference_no, `%${filters.search}%`),
              ),
            )
          : and(...conditions),
      )
      .orderBy(desc(bonafideCertificates.created_at))
      .limit(limit)
      .offset(offset);

    return rows.map((r) => ({
      ...r,
      student_name: `${r.student_first_name} ${r.student_last_name ?? ''}`.trim(),
    }));
  }

  async count(schoolId: string, filters: BonafideCertificateFilterDto): Promise<number> {
    const conditions = this.buildBaseConditions(schoolId, filters);

    const whereClause = filters.search
      ? and(
          ...conditions,
          or(
            ilike(schema.students.first_name, `%${filters.search}%`),
            ilike(schema.students.last_name, `%${filters.search}%`),
            ilike(bonafideCertificates.reference_no, `%${filters.search}%`),
          ),
        )
      : and(...conditions);

    const [{ total }] = await this.db
      .select({ total: sql<number>`count(*)` })
      .from(bonafideCertificates)
      .innerJoin(schema.students, eq(bonafideCertificates.student_id, schema.students.id))
      .where(whereClause);

    return Number(total);
  }

  async findById(id: string, schoolId: string): Promise<BonafideCertificateDetailRow | undefined> {
    const rows = await this.db
      .select({
        cert: bonafideCertificates,
        student: {
          id: schema.students.id,
          first_name: schema.students.first_name,
          last_name: schema.students.last_name,
          date_of_birth: schema.students.date_of_birth,
          aadhaar_number: schema.students.aadhaar_number,
          profile_image: schema.students.profile_image,
        },
        class: {
          id: schema.classes.id,
          name: schema.classes.name,
        },
        section: {
          id: schema.sections.id,
          name: schema.sections.name,
        },
        academic_year: {
          id: schema.academicYears.id,
          name: schema.academicYears.name,
        },
      })
      .from(bonafideCertificates)
      .innerJoin(schema.students, eq(bonafideCertificates.student_id, schema.students.id))
      .leftJoin(schema.classes, eq(bonafideCertificates.class_id, schema.classes.id))
      .leftJoin(schema.sections, eq(bonafideCertificates.section_id, schema.sections.id))
      .leftJoin(
        schema.academicYears,
        eq(bonafideCertificates.academic_year_id, schema.academicYears.id),
      )
      .where(
        and(
          eq(bonafideCertificates.id, id),
          eq(bonafideCertificates.school_id, schoolId),
          eq(bonafideCertificates.deleted, false),
        ),
      )
      .limit(1);

    if (!rows.length) return undefined;

    const row = rows[0];

    const parents = await this.db
      .select({
        id: schema.studentParents.id,
        relation: schema.studentParents.relation,
        first_name: schema.studentParents.first_name,
        last_name: schema.studentParents.last_name,
        phone_number: schema.studentParents.phone_number,
        is_primary: schema.studentParents.is_primary,
      })
      .from(schema.studentParents)
      .where(
        and(
          eq(schema.studentParents.student_id, row.cert.student_id),
          eq(schema.studentParents.deleted, false),
        ),
      );

    return {
      ...row.cert,
      student: row.student,
      class: row.class,
      section: row.section,
      academic_year: row.academic_year,
      parents,
    };
  }

  async countBySchool(schoolId: string): Promise<number> {
    const [{ total }] = await this.db
      .select({ total: sql<number>`count(*)` })
      .from(bonafideCertificates)
      .where(eq(bonafideCertificates.school_id, schoolId));
    return Number(total);
  }

  async create(data: NewBonafideCertificate): Promise<BonafideCertificate> {
    const [row] = await this.db.insert(bonafideCertificates).values(data).returning();
    return row;
  }

  async updatePdf(
    id: string,
    schoolId: string,
    pdfUrl: string,
    pdfS3Key: string,
  ): Promise<BonafideCertificate> {
    const [row] = await this.db
      .update(bonafideCertificates)
      .set({ pdf_url: pdfUrl, pdf_s3_key: pdfS3Key, status: 'GENERATED', updated_at: new Date() })
      .where(and(eq(bonafideCertificates.id, id), eq(bonafideCertificates.school_id, schoolId)))
      .returning();
    return row;
  }

  async softDelete(id: string, schoolId: string): Promise<void> {
    await this.db
      .update(bonafideCertificates)
      .set({ deleted: true, updated_at: new Date() })
      .where(and(eq(bonafideCertificates.id, id), eq(bonafideCertificates.school_id, schoolId)));
  }
}
