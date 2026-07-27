import { Injectable, Inject } from '@nestjs/common';
import { eq, and, sql, desc } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import {
  feeTypes,
  feePlans,
  feeClassStructures,
  transportRoutes,
  transportRouteFees,
  feeBills,
  feeBillPayments,
  feeDiscounts,
  feeLateRules,
  financeHeads,
  academicYears,
} from '../../database/drizzle/schema';
import {
  NewFeeType,
  FeeType,
  FeeTypeWithHead,
  NewFeePlan,
  FeePlan,
  NewFeeClassStructure,
  FeeClassStructureWithType,
  FeeClassStructureAllTypes,
  NewTransportRoute,
  TransportRoute,
  NewTransportRouteFee,
  TransportRouteFeeWithType,
  NewFeeBill,
  FeeBill,
  FeeBillWithType,
  NewFeeBillPayment,
  FeeBillPayment,
  NewFeeDiscount,
  NewFeeLateRule,
  FeeLateRule,
  StudentMonthlyDue,
  DemandReceiptStudent,
} from './types/fee.types';
import { FilterFeeTypeDto } from './dto/fee-type/filter-fee-type.dto';
import { FilterFeeBillDto } from './dto/fee-bill/filter-fee-bill.dto';
import {
  students,
  studentAcademicInfo,
  studentParents,
} from '../../database/drizzle/schema/students.schema';

@Injectable()
export class FeesRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  // ─── FEE TYPES ───────────────────────────────────────────────────────────────

  async findAllFeeTypes(schoolId: string, filters: FilterFeeTypeDto): Promise<FeeTypeWithHead[]> {
    const conditions = [eq(feeTypes.school_id, schoolId), eq(feeTypes.deleted, false)];
    if (filters.fee_category) conditions.push(eq(feeTypes.fee_category, filters.fee_category));
    if (filters.is_active !== undefined) conditions.push(eq(feeTypes.is_active, filters.is_active));
    const limit = Number(filters.limit ?? 50);
    const offset = (Number(filters.page ?? 1) - 1) * limit;
    const rows = await this.db
      .select({
        id: feeTypes.id,
        school_id: feeTypes.school_id,
        name: feeTypes.name,
        fee_category: feeTypes.fee_category,
        frequency: feeTypes.frequency,
        applicable_months: feeTypes.applicable_months,
        income_head_id: feeTypes.income_head_id,
        is_active: feeTypes.is_active,
        deleted: feeTypes.deleted,
        created_by: feeTypes.created_by,
        created_at: feeTypes.created_at,
        updated_at: feeTypes.updated_at,
        income_head_name: financeHeads.name,
      })
      .from(feeTypes)
      .leftJoin(financeHeads, eq(feeTypes.income_head_id, financeHeads.id))
      .where(and(...conditions))
      .orderBy(feeTypes.created_at)
      .limit(limit)
      .offset(offset);
    return rows as unknown as FeeTypeWithHead[];
  }

  async countFeeTypes(schoolId: string, filters: FilterFeeTypeDto): Promise<number> {
    const conditions = [eq(feeTypes.school_id, schoolId), eq(feeTypes.deleted, false)];
    if (filters.fee_category) conditions.push(eq(feeTypes.fee_category, filters.fee_category));
    if (filters.is_active !== undefined) conditions.push(eq(feeTypes.is_active, filters.is_active));
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(feeTypes)
      .where(and(...conditions));
    return Number(count);
  }

  async findFeeTypeById(id: string, schoolId: string): Promise<FeeTypeWithHead | undefined> {
    const [row] = await this.db
      .select({
        id: feeTypes.id,
        school_id: feeTypes.school_id,
        name: feeTypes.name,
        fee_category: feeTypes.fee_category,
        frequency: feeTypes.frequency,
        applicable_months: feeTypes.applicable_months,
        income_head_id: feeTypes.income_head_id,
        is_active: feeTypes.is_active,
        deleted: feeTypes.deleted,
        created_by: feeTypes.created_by,
        created_at: feeTypes.created_at,
        updated_at: feeTypes.updated_at,
        income_head_name: financeHeads.name,
      })
      .from(feeTypes)
      .leftJoin(financeHeads, eq(feeTypes.income_head_id, financeHeads.id))
      .where(
        and(eq(feeTypes.id, id), eq(feeTypes.school_id, schoolId), eq(feeTypes.deleted, false)),
      );
    return row as unknown as FeeTypeWithHead | undefined;
  }

  async createFeeType(data: NewFeeType): Promise<FeeType> {
    const [row] = await this.db.insert(feeTypes).values(data).returning();
    return row;
  }

  async updateFeeType(
    id: string,
    schoolId: string,
    data: Partial<NewFeeType>,
  ): Promise<FeeType | undefined> {
    const [row] = await this.db
      .update(feeTypes)
      .set({ ...data, updated_at: new Date() })
      .where(and(eq(feeTypes.id, id), eq(feeTypes.school_id, schoolId)))
      .returning();
    return row;
  }

  async softDeleteFeeType(id: string, schoolId: string): Promise<void> {
    await this.db
      .update(feeTypes)
      .set({ deleted: true, updated_at: new Date() })
      .where(and(eq(feeTypes.id, id), eq(feeTypes.school_id, schoolId)));
  }

  // ─── FEE PLANS ───────────────────────────────────────────────────────────────

  async findAllFeePlans(schoolId: string): Promise<FeePlan[]> {
    return this.db
      .select()
      .from(feePlans)
      .where(and(eq(feePlans.school_id, schoolId), eq(feePlans.deleted, false)))
      .orderBy(feePlans.created_at);
  }

  async findFeePlanById(id: string, schoolId: string): Promise<FeePlan | undefined> {
    const [row] = await this.db
      .select()
      .from(feePlans)
      .where(
        and(eq(feePlans.id, id), eq(feePlans.school_id, schoolId), eq(feePlans.deleted, false)),
      );
    return row;
  }

  async createFeePlan(data: NewFeePlan): Promise<FeePlan> {
    const [row] = await this.db.insert(feePlans).values(data).returning();
    return row;
  }

  async updateFeePlan(
    id: string,
    schoolId: string,
    data: Partial<NewFeePlan>,
  ): Promise<FeePlan | undefined> {
    const [row] = await this.db
      .update(feePlans)
      .set(data)
      .where(and(eq(feePlans.id, id), eq(feePlans.school_id, schoolId)))
      .returning();
    return row;
  }

  async countFeePlansBySchool(schoolId: string): Promise<number> {
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(feePlans)
      .where(and(eq(feePlans.school_id, schoolId), eq(feePlans.deleted, false)));
    return Number(count);
  }

  // ─── CLASS FEE STRUCTURES ────────────────────────────────────────────────────

  async findClassStructure(
    schoolId: string,
    academicYearId: string,
    feePlanId: string,
    classId: string,
  ): Promise<FeeClassStructureWithType[]> {
    const rows = await this.db
      .select({
        id: feeClassStructures.id,
        school_id: feeClassStructures.school_id,
        academic_year_id: feeClassStructures.academic_year_id,
        fee_plan_id: feeClassStructures.fee_plan_id,
        class_id: feeClassStructures.class_id,
        fee_type_id: feeClassStructures.fee_type_id,
        amount: feeClassStructures.amount,
        is_enabled: feeClassStructures.is_enabled,
        deleted: feeClassStructures.deleted,
        created_by: feeClassStructures.created_by,
        created_at: feeClassStructures.created_at,
        updated_at: feeClassStructures.updated_at,
        fee_type_name: feeTypes.name,
        fee_category: feeTypes.fee_category,
        frequency: feeTypes.frequency,
        applicable_months: feeTypes.applicable_months,
      })
      .from(feeClassStructures)
      .innerJoin(feeTypes, eq(feeClassStructures.fee_type_id, feeTypes.id))
      .where(
        and(
          eq(feeClassStructures.school_id, schoolId),
          eq(feeClassStructures.academic_year_id, academicYearId),
          eq(feeClassStructures.fee_plan_id, feePlanId),
          eq(feeClassStructures.class_id, classId),
          eq(feeClassStructures.deleted, false),
        ),
      )
      .orderBy(feeTypes.name);
    return rows as unknown as FeeClassStructureWithType[];
  }

  async findClassStructureAllTypes(
    schoolId: string,
    academicYearId: string,
    feePlanId: string,
    classId: string,
  ): Promise<FeeClassStructureAllTypes[]> {
    const rows = await this.db
      .select({
        fee_type_id: feeTypes.id,
        fee_type_name: feeTypes.name,
        fee_category: feeTypes.fee_category,
        frequency: feeTypes.frequency,
        applicable_months: feeTypes.applicable_months,
        fee_type_active: feeTypes.is_active,
        structure_id: feeClassStructures.id,
        amount: feeClassStructures.amount,
        is_enabled: feeClassStructures.is_enabled,
      })
      .from(feeTypes)
      .leftJoin(
        feeClassStructures,
        and(
          eq(feeClassStructures.fee_type_id, feeTypes.id),
          eq(feeClassStructures.school_id, schoolId),
          eq(feeClassStructures.academic_year_id, academicYearId),
          eq(feeClassStructures.fee_plan_id, feePlanId),
          eq(feeClassStructures.class_id, classId),
          eq(feeClassStructures.deleted, false),
        ),
      )
      .where(
        and(
          eq(feeTypes.school_id, schoolId),
          eq(feeTypes.deleted, false),
          eq(feeTypes.fee_category, 'Class'),
        ),
      )
      .orderBy(feeTypes.name);
    return rows as unknown as FeeClassStructureAllTypes[];
  }

  async upsertClassStructureItem(data: NewFeeClassStructure): Promise<void> {
    await this.db
      .insert(feeClassStructures)
      .values(data)
      .onConflictDoUpdate({
        target: [
          feeClassStructures.school_id,
          feeClassStructures.academic_year_id,
          feeClassStructures.fee_plan_id,
          feeClassStructures.class_id,
          feeClassStructures.fee_type_id,
        ],
        set: { amount: data.amount, is_enabled: data.is_enabled, updated_at: new Date() },
      });
  }

  // ─── TRANSPORT ROUTES ────────────────────────────────────────────────────────

  async findAllTransportRoutes(schoolId: string): Promise<TransportRoute[]> {
    return this.db
      .select()
      .from(transportRoutes)
      .where(and(eq(transportRoutes.school_id, schoolId), eq(transportRoutes.deleted, false)))
      .orderBy(transportRoutes.name);
  }

  async findTransportRouteById(id: string, schoolId: string): Promise<TransportRoute | undefined> {
    const [row] = await this.db
      .select()
      .from(transportRoutes)
      .where(
        and(
          eq(transportRoutes.id, id),
          eq(transportRoutes.school_id, schoolId),
          eq(transportRoutes.deleted, false),
        ),
      );
    return row;
  }

  async createTransportRoute(data: NewTransportRoute): Promise<TransportRoute> {
    const [row] = await this.db.insert(transportRoutes).values(data).returning();
    return row;
  }

  async updateTransportRoute(
    id: string,
    schoolId: string,
    data: Partial<NewTransportRoute>,
  ): Promise<TransportRoute | undefined> {
    const [row] = await this.db
      .update(transportRoutes)
      .set(data)
      .where(and(eq(transportRoutes.id, id), eq(transportRoutes.school_id, schoolId)))
      .returning();
    return row;
  }

  async softDeleteTransportRoute(id: string, schoolId: string): Promise<void> {
    await this.db
      .update(transportRoutes)
      .set({ deleted: true })
      .where(and(eq(transportRoutes.id, id), eq(transportRoutes.school_id, schoolId)));
  }

  async findRouteFees(
    routeId: string,
    schoolId: string,
    academicYearId: string,
  ): Promise<TransportRouteFeeWithType[]> {
    const rows = await this.db
      .select({
        id: transportRouteFees.id,
        school_id: transportRouteFees.school_id,
        academic_year_id: transportRouteFees.academic_year_id,
        route_id: transportRouteFees.route_id,
        fee_type_id: transportRouteFees.fee_type_id,
        amount: transportRouteFees.amount,
        is_enabled: transportRouteFees.is_enabled,
        deleted: transportRouteFees.deleted,
        created_by: transportRouteFees.created_by,
        created_at: transportRouteFees.created_at,
        fee_type_name: feeTypes.name,
        frequency: feeTypes.frequency,
        applicable_months: feeTypes.applicable_months,
      })
      .from(transportRouteFees)
      .innerJoin(feeTypes, eq(transportRouteFees.fee_type_id, feeTypes.id))
      .where(
        and(
          eq(transportRouteFees.route_id, routeId),
          eq(transportRouteFees.school_id, schoolId),
          eq(transportRouteFees.academic_year_id, academicYearId),
          eq(transportRouteFees.deleted, false),
        ),
      );
    return rows as unknown as TransportRouteFeeWithType[];
  }

  async upsertRouteFeeItem(data: NewTransportRouteFee): Promise<void> {
    await this.db
      .insert(transportRouteFees)
      .values(data)
      .onConflictDoUpdate({
        target: [
          transportRouteFees.school_id,
          transportRouteFees.academic_year_id,
          transportRouteFees.route_id,
          transportRouteFees.fee_type_id,
        ],
        set: { amount: data.amount, is_enabled: data.is_enabled },
      });
  }

  // ─── FEE BILLS ───────────────────────────────────────────────────────────────

  async findBills(schoolId: string, filters: FilterFeeBillDto): Promise<FeeBillWithType[]> {
    const conditions = [eq(feeBills.school_id, schoolId), eq(feeBills.deleted, false)];
    if (filters.student_id) conditions.push(eq(feeBills.student_id, filters.student_id));
    if (filters.academic_year_id)
      conditions.push(eq(feeBills.academic_year_id, filters.academic_year_id));
    if (filters.month) conditions.push(eq(feeBills.bill_month, filters.month));
    if (filters.status)
      conditions.push(
        eq(
          feeBills.status,
          filters.status as 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'WAIVED',
        ),
      );
    const limit = Number(filters.limit ?? 25);
    const offset = (Number(filters.page ?? 1) - 1) * limit;
    const rows = await this.db
      .select({
        id: feeBills.id,
        school_id: feeBills.school_id,
        student_id: feeBills.student_id,
        academic_year_id: feeBills.academic_year_id,
        fee_type_id: feeBills.fee_type_id,
        fee_plan_id: feeBills.fee_plan_id,
        bill_month: feeBills.bill_month,
        due_date: feeBills.due_date,
        total_amount: feeBills.total_amount,
        discount_amount: feeBills.discount_amount,
        paid_amount: feeBills.paid_amount,
        late_fine_amount: feeBills.late_fine_amount,
        status: feeBills.status,
        is_manual: feeBills.is_manual,
        notes: feeBills.notes,
        deleted: feeBills.deleted,
        created_by: feeBills.created_by,
        created_at: feeBills.created_at,
        updated_at: feeBills.updated_at,
        fee_type_name: feeTypes.name,
        fee_category: feeTypes.fee_category,
        frequency: feeTypes.frequency,
        fee_plan_name: feePlans.name,
      })
      .from(feeBills)
      .innerJoin(feeTypes, eq(feeBills.fee_type_id, feeTypes.id))
      .leftJoin(feePlans, eq(feeBills.fee_plan_id, feePlans.id))
      .where(and(...conditions))
      .orderBy(desc(feeBills.created_at))
      .limit(limit)
      .offset(offset);
    return rows as unknown as FeeBillWithType[];
  }

  async findStudentBills(
    studentId: string,
    schoolId: string,
    academicYearId: string,
  ): Promise<FeeBillWithType[]> {
    const rows = await this.db
      .select({
        id: feeBills.id,
        school_id: feeBills.school_id,
        student_id: feeBills.student_id,
        academic_year_id: feeBills.academic_year_id,
        fee_type_id: feeBills.fee_type_id,
        fee_plan_id: feeBills.fee_plan_id,
        bill_month: feeBills.bill_month,
        due_date: feeBills.due_date,
        total_amount: feeBills.total_amount,
        discount_amount: feeBills.discount_amount,
        paid_amount: feeBills.paid_amount,
        late_fine_amount: feeBills.late_fine_amount,
        status: feeBills.status,
        is_manual: feeBills.is_manual,
        notes: feeBills.notes,
        deleted: feeBills.deleted,
        created_by: feeBills.created_by,
        created_at: feeBills.created_at,
        updated_at: feeBills.updated_at,
        fee_type_name: feeTypes.name,
        fee_category: feeTypes.fee_category,
        frequency: feeTypes.frequency,
        fee_plan_name: feePlans.name,
      })
      .from(feeBills)
      .innerJoin(feeTypes, eq(feeBills.fee_type_id, feeTypes.id))
      .leftJoin(feePlans, eq(feeBills.fee_plan_id, feePlans.id))
      .where(
        and(
          eq(feeBills.student_id, studentId),
          eq(feeBills.school_id, schoolId),
          eq(feeBills.academic_year_id, academicYearId),
          eq(feeBills.deleted, false),
        ),
      )
      .orderBy(feeBills.bill_month, feeBills.created_at);
    return rows as unknown as FeeBillWithType[];
  }

  async findBillById(id: string, schoolId: string): Promise<FeeBill | undefined> {
    const [row] = await this.db
      .select()
      .from(feeBills)
      .where(
        and(eq(feeBills.id, id), eq(feeBills.school_id, schoolId), eq(feeBills.deleted, false)),
      );
    return row;
  }

  async createBill(data: NewFeeBill): Promise<FeeBill> {
    const [row] = await this.db.insert(feeBills).values(data).returning();
    return row;
  }

  async updateBill(
    id: string,
    schoolId: string,
    data: Partial<NewFeeBill>,
  ): Promise<FeeBill | undefined> {
    const [row] = await this.db
      .update(feeBills)
      .set({ ...data, updated_at: new Date() })
      .where(and(eq(feeBills.id, id), eq(feeBills.school_id, schoolId)))
      .returning();
    return row;
  }

  async findStudentsByClass(
    schoolId: string,
    academicYearId: string,
    classId: string,
  ): Promise<
    { id: string; first_name: string; last_name: string | null; admission_number: string | null }[]
  > {
    return this.db
      .select({
        id: students.id,
        first_name: students.first_name,
        last_name: students.last_name,
        admission_number: studentAcademicInfo.admission_number,
      })
      .from(students)
      .innerJoin(
        studentAcademicInfo,
        and(
          eq(studentAcademicInfo.student_id, students.id),
          eq(studentAcademicInfo.academic_year_id, academicYearId),
          eq(studentAcademicInfo.class_id, classId),
          eq(studentAcademicInfo.is_current, true),
          eq(studentAcademicInfo.deleted, false),
        ),
      )
      .where(
        and(
          eq(students.school_id, schoolId),
          eq(students.deleted, false),
          eq(students.is_enabled, true),
        ),
      );
  }

  // ─── FEE BILL PAYMENTS ───────────────────────────────────────────────────────

  /** Records the payment and updates the bill's paid_amount/status atomically. */
  async createBillPaymentAndUpdateBill(
    paymentData: NewFeeBillPayment,
    billId: string,
    schoolId: string,
    billUpdate: Partial<NewFeeBill>,
  ): Promise<FeeBillPayment> {
    return this.db.transaction(async (tx) => {
      const [payment] = await tx.insert(feeBillPayments).values(paymentData).returning();
      await tx
        .update(feeBills)
        .set({ ...billUpdate, updated_at: new Date() })
        .where(and(eq(feeBills.id, billId), eq(feeBills.school_id, schoolId)));
      return payment;
    });
  }

  async findPaymentsByBillId(billId: string): Promise<FeeBillPayment[]> {
    return this.db
      .select()
      .from(feeBillPayments)
      .where(eq(feeBillPayments.bill_id, billId))
      .orderBy(desc(feeBillPayments.created_at));
  }

  async findPaymentById(id: string, schoolId: string): Promise<FeeBillPayment | undefined> {
    const [row] = await this.db
      .select()
      .from(feeBillPayments)
      .where(and(eq(feeBillPayments.id, id), eq(feeBillPayments.school_id, schoolId)));
    return row;
  }

  /** Reverses the bill's paid_amount/status and removes the payment row atomically. */
  async updateBillAndDeletePayment(
    billId: string,
    schoolId: string,
    billUpdate: Partial<NewFeeBill>,
    paymentId: string,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .update(feeBills)
        .set({ ...billUpdate, updated_at: new Date() })
        .where(and(eq(feeBills.id, billId), eq(feeBills.school_id, schoolId)));
      await tx.delete(feeBillPayments).where(eq(feeBillPayments.id, paymentId));
    });
  }

  async findAcademicYearById(id: string): Promise<{ start_date: string } | undefined> {
    const [row] = await this.db
      .select({ start_date: academicYears.start_date })
      .from(academicYears)
      .where(eq(academicYears.id, id));
    return row;
  }

  async billExistsForStudentFeeTypeMonth(
    studentId: string,
    schoolId: string,
    academicYearId: string,
    feeTypeId: string,
    billMonth: string | null,
  ): Promise<boolean> {
    const conditions = [
      eq(feeBills.student_id, studentId),
      eq(feeBills.school_id, schoolId),
      eq(feeBills.academic_year_id, academicYearId),
      eq(feeBills.fee_type_id, feeTypeId),
      eq(feeBills.deleted, false),
    ];
    if (billMonth !== null) {
      conditions.push(eq(feeBills.bill_month, billMonth));
    }
    const [row] = await this.db
      .select({ id: feeBills.id })
      .from(feeBills)
      .where(and(...conditions))
      .limit(1);
    return !!row;
  }

  // ─── FEE DISCOUNTS ───────────────────────────────────────────────────────────

  async createDiscount(data: NewFeeDiscount): Promise<void> {
    await this.db.insert(feeDiscounts).values(data);
  }

  async findBillsByStudentAndFeeType(
    studentId: string,
    schoolId: string,
    academicYearId: string,
    feeTypeId: string,
  ): Promise<FeeBill[]> {
    return this.db
      .select()
      .from(feeBills)
      .where(
        and(
          eq(feeBills.student_id, studentId),
          eq(feeBills.school_id, schoolId),
          eq(feeBills.academic_year_id, academicYearId),
          eq(feeBills.fee_type_id, feeTypeId),
          eq(feeBills.deleted, false),
        ),
      );
  }

  // ─── MONTHLY DUES ────────────────────────────────────────────────────────────

  async findMonthlyDuesByClass(
    schoolId: string,
    academicYearId: string,
    classId: string,
    month: string,
  ): Promise<StudentMonthlyDue[]> {
    const rows = await this.db
      .select({
        student_id: students.id,
        first_name: students.first_name,
        last_name: students.last_name,
        phone: students.phone_number,
        admission_number: studentAcademicInfo.admission_number,
        roll_no: studentAcademicInfo.roll_number,
        bill_id: feeBills.id,
        total_amount: feeBills.total_amount,
        paid_amount: feeBills.paid_amount,
        discount_amount: feeBills.discount_amount,
        father_first_name: studentParents.first_name,
        father_last_name: studentParents.last_name,
      })
      .from(students)
      .innerJoin(
        studentAcademicInfo,
        and(
          eq(studentAcademicInfo.student_id, students.id),
          eq(studentAcademicInfo.academic_year_id, academicYearId),
          eq(studentAcademicInfo.class_id, classId),
          eq(studentAcademicInfo.is_current, true),
          eq(studentAcademicInfo.deleted, false),
        ),
      )
      .innerJoin(
        feeBills,
        and(
          eq(feeBills.student_id, students.id),
          eq(feeBills.school_id, schoolId),
          eq(feeBills.academic_year_id, academicYearId),
          eq(feeBills.bill_month, month),
          eq(feeBills.deleted, false),
        ),
      )
      .leftJoin(
        studentParents,
        and(
          eq(studentParents.student_id, students.id),
          eq(studentParents.relation, 'FATHER'),
          eq(studentParents.deleted, false),
        ),
      )
      .where(
        and(
          eq(students.school_id, schoolId),
          eq(students.deleted, false),
          eq(students.is_enabled, true),
        ),
      )
      .orderBy(studentAcademicInfo.roll_number, students.first_name);

    const studentMap = new Map<string, StudentMonthlyDue>();
    for (const row of rows) {
      const due = (
        parseFloat(row.total_amount) -
        parseFloat(row.paid_amount) -
        parseFloat(row.discount_amount)
      ).toFixed(2);
      const existing = studentMap.get(row.student_id);
      if (existing) {
        existing.due_amount = (parseFloat(existing.due_amount) + parseFloat(due)).toFixed(2);
        existing.bill_ids.push(row.bill_id);
      } else {
        const fatherName = row.father_first_name
          ? `${row.father_first_name}${row.father_last_name ? ' ' + row.father_last_name : ''}`
          : null;
        studentMap.set(row.student_id, {
          student_id: row.student_id,
          student_name: `${row.first_name}${row.last_name ? ' ' + row.last_name : ''}`,
          father_name: fatherName,
          phone: row.phone ?? null,
          admission_number: row.admission_number ?? null,
          roll_no: row.roll_no ?? null,
          month,
          due_amount: due,
          bill_ids: [row.bill_id],
        });
      }
    }
    return Array.from(studentMap.values());
  }

  // ─── LATE RULES ──────────────────────────────────────────────────────────────

  async findAllLateRules(schoolId: string, academicYearId?: string): Promise<FeeLateRule[]> {
    const conditions = [eq(feeLateRules.school_id, schoolId), eq(feeLateRules.deleted, false)];
    if (academicYearId) conditions.push(eq(feeLateRules.academic_year_id, academicYearId));
    return this.db
      .select()
      .from(feeLateRules)
      .where(and(...conditions))
      .orderBy(desc(feeLateRules.created_at));
  }

  async createLateRule(data: NewFeeLateRule): Promise<FeeLateRule> {
    const [row] = await this.db.insert(feeLateRules).values(data).returning();
    return row;
  }

  async updateLateRule(
    id: string,
    schoolId: string,
    data: Partial<NewFeeLateRule>,
  ): Promise<FeeLateRule | undefined> {
    const [row] = await this.db
      .update(feeLateRules)
      .set(data)
      .where(and(eq(feeLateRules.id, id), eq(feeLateRules.school_id, schoolId)))
      .returning();
    return row;
  }

  async softDeleteLateRule(id: string, schoolId: string): Promise<void> {
    await this.db
      .update(feeLateRules)
      .set({ deleted: true })
      .where(and(eq(feeLateRules.id, id), eq(feeLateRules.school_id, schoolId)));
  }

  // ─── DEMAND RECEIPT ──────────────────────────────────────────────────────────

  async findBillsForDemandReceipt(
    schoolId: string,
    academicYearId: string,
    classId: string,
    monthFrom: string,
    monthTo: string,
  ): Promise<DemandReceiptStudent[]> {
    const rows = await this.db
      .select({
        student_id: students.id,
        first_name: students.first_name,
        last_name: students.last_name,
        admission_number: studentAcademicInfo.admission_number,
        roll_no: studentAcademicInfo.roll_number,
        bill_id: feeBills.id,
        fee_type_name: feeTypes.name,
        frequency: feeTypes.frequency,
        bill_month: feeBills.bill_month,
        total_amount: feeBills.total_amount,
        paid_amount: feeBills.paid_amount,
        discount_amount: feeBills.discount_amount,
        due_date: feeBills.due_date,
      })
      .from(students)
      .innerJoin(
        studentAcademicInfo,
        and(
          eq(studentAcademicInfo.student_id, students.id),
          eq(studentAcademicInfo.academic_year_id, academicYearId),
          eq(studentAcademicInfo.class_id, classId),
          eq(studentAcademicInfo.is_current, true),
          eq(studentAcademicInfo.deleted, false),
        ),
      )
      .innerJoin(
        feeBills,
        and(
          eq(feeBills.student_id, students.id),
          eq(feeBills.school_id, schoolId),
          eq(feeBills.academic_year_id, academicYearId),
          eq(feeBills.deleted, false),
        ),
      )
      .innerJoin(feeTypes, eq(feeBills.fee_type_id, feeTypes.id))
      .where(
        and(
          eq(students.school_id, schoolId),
          eq(students.deleted, false),
          eq(students.is_enabled, true),
        ),
      )
      .orderBy(studentAcademicInfo.roll_number, students.first_name, feeBills.bill_month);

    const studentMap = new Map<string, DemandReceiptStudent>();
    for (const row of rows) {
      const billMonthStr = row.bill_month ?? '';
      const inRange = !billMonthStr || (billMonthStr >= monthFrom && billMonthStr <= monthTo);
      if (!inRange) continue;
      const dueAmt =
        parseFloat(row.total_amount) -
        parseFloat(row.paid_amount) -
        parseFloat(row.discount_amount);
      if (dueAmt <= 0) continue;
      const billEntry = {
        fee_type_name: row.fee_type_name,
        frequency: row.frequency,
        bill_month: row.bill_month ?? null,
        total_amount: row.total_amount,
        paid_amount: row.paid_amount,
        due_amount: dueAmt.toFixed(2),
        due_date: row.due_date ?? null,
      };
      const existing = studentMap.get(row.student_id);
      if (existing) {
        existing.bills.push(billEntry);
        existing.total_due = (parseFloat(existing.total_due) + dueAmt).toFixed(2);
      } else {
        studentMap.set(row.student_id, {
          student_id: row.student_id,
          student_name: `${row.first_name}${row.last_name ? ' ' + row.last_name : ''}`,
          father_name: null,
          admission_number: row.admission_number ?? null,
          roll_no: row.roll_no ?? null,
          bills: [billEntry],
          total_due: dueAmt.toFixed(2),
        });
      }
    }
    return Array.from(studentMap.values());
  }
}
