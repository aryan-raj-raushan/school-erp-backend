import { Injectable, Inject } from '@nestjs/common';
import { and, eq, ilike, or, desc, sql, count } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import * as schema from '../../database/drizzle/schema';
import {
  NewTransferCertificate,
  TransferCertificate,
  TransferCertificateListRow,
  TransferCertificateDetailRow,
} from './types/certificates.types';
import { TransferCertificateFilterDto } from './dto/certificates.dto';
import { transferCertificates } from '@database/drizzle/schema/certificates.schema';

@Injectable()
export class TransferCertificateRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  // ─── Private helpers ───────────────────────────────────────────────────────

  private buildBaseConditions(schoolId: string, filters: TransferCertificateFilterDto) {
    const conditions = [
      eq(transferCertificates.school_id, schoolId),
      eq(transferCertificates.deleted, false),
    ];

    if (filters.academic_year_id) {
      conditions.push(eq(transferCertificates.academic_year_id, filters.academic_year_id));
    }
    if (filters.class_id) {
      conditions.push(eq(transferCertificates.class_id, filters.class_id));
    }
    if (filters.section_id) {
      conditions.push(eq(transferCertificates.section_id, filters.section_id));
    }
    if (filters.status) {
      conditions.push(eq(transferCertificates.status, filters.status as any));
    }

    return conditions;
  }

  // ─── Queries ───────────────────────────────────────────────────────────────

  async findAll(
    schoolId: string,
    filters: TransferCertificateFilterDto,
  ): Promise<TransferCertificateListRow[]> {
    const conditions = this.buildBaseConditions(schoolId, filters);
    const limit = filters.limit ?? 20;
    const offset = ((filters.page ?? 1) - 1) * limit;

    const rows = await this.db
      .select({
        id: transferCertificates.id,
        reference_no: transferCertificates.reference_no,
        leaving_reason: transferCertificates.leaving_reason,
        status: transferCertificates.status,
        pdf_url: transferCertificates.pdf_url,
        created_at: transferCertificates.created_at,
        student_first_name: schema.students.first_name,
        student_last_name: schema.students.last_name,
        class_name: schema.classes.name,
        section_name: schema.sections.name,
        academic_year_name: schema.academicYears.name,
      })
      .from(transferCertificates)
      .innerJoin(schema.students, eq(transferCertificates.student_id, schema.students.id))
      .leftJoin(schema.classes, eq(transferCertificates.class_id, schema.classes.id))
      .leftJoin(schema.sections, eq(transferCertificates.section_id, schema.sections.id))
      .leftJoin(
        schema.academicYears,
        eq(transferCertificates.academic_year_id, schema.academicYears.id),
      )
      .where(
        filters.search
          ? and(
              ...conditions,
              or(
                ilike(schema.students.first_name, `%${filters.search}%`),
                ilike(schema.students.last_name, `%${filters.search}%`),
                ilike(transferCertificates.reference_no, `%${filters.search}%`),
              ),
            )
          : and(...conditions),
      )
      .orderBy(desc(transferCertificates.created_at))
      .limit(limit)
      .offset(offset);

    return rows.map((r) => ({
      ...r,
      student_name: `${r.student_first_name} ${r.student_last_name ?? ''}`.trim(),
    }));
  }

  async count(schoolId: string, filters: TransferCertificateFilterDto): Promise<number> {
    const conditions = this.buildBaseConditions(schoolId, filters);

    const whereClause = filters.search
      ? and(
          ...conditions,
          or(
            ilike(schema.students.first_name, `%${filters.search}%`),
            ilike(schema.students.last_name, `%${filters.search}%`),
            ilike(transferCertificates.reference_no, `%${filters.search}%`),
          ),
        )
      : and(...conditions);

    const [{ total }] = await this.db
      .select({ total: sql<number>`count(*)` })
      .from(transferCertificates)
      .innerJoin(schema.students, eq(transferCertificates.student_id, schema.students.id))
      .where(whereClause);

    return Number(total);
  }

  async findById(
    id: string,
    schoolId: string,
  ): Promise<TransferCertificateDetailRow | undefined> {
    const rows = await this.db
      .select({
        cert: transferCertificates,
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
      .from(transferCertificates)
      .innerJoin(schema.students, eq(transferCertificates.student_id, schema.students.id))
      .leftJoin(schema.classes, eq(transferCertificates.class_id, schema.classes.id))
      .leftJoin(schema.sections, eq(transferCertificates.section_id, schema.sections.id))
      .leftJoin(
        schema.academicYears,
        eq(transferCertificates.academic_year_id, schema.academicYears.id),
      )
      .where(
        and(
          eq(transferCertificates.id, id),
          eq(transferCertificates.school_id, schoolId),
          eq(transferCertificates.deleted, false),
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
      .from(transferCertificates)
      .where(eq(transferCertificates.school_id, schoolId));
    return Number(total);
  }

  async create(data: NewTransferCertificate): Promise<TransferCertificate> {
    const [row] = await this.db.insert(transferCertificates).values(data).returning();
    return row;
  }

  async updatePdf(
    id: string,
    schoolId: string,
    pdfUrl: string,
    pdfS3Key: string,
  ): Promise<TransferCertificate> {
    const [row] = await this.db
      .update(transferCertificates)
      .set({ pdf_url: pdfUrl, pdf_s3_key: pdfS3Key, status: 'GENERATED', updated_at: new Date() })
      .where(
        and(eq(transferCertificates.id, id), eq(transferCertificates.school_id, schoolId)),
      )
      .returning();
    return row;
  }

  async softDelete(id: string, schoolId: string): Promise<void> {
    await this.db
      .update(transferCertificates)
      .set({ deleted: true, updated_at: new Date() })
      .where(
        and(eq(transferCertificates.id, id), eq(transferCertificates.school_id, schoolId)),
      );
  }
}