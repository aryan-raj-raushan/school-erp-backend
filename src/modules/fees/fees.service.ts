import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { FeesRepository } from './fees.repository';
import { FinanceService } from '../finance/finance.service';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { PaginationResponse } from '../../shared/responses/api-response';
import { CacheTTL } from '../../shared/constants';
import { CreateFeeTypeDto } from './dto/fee-type/create-fee-type.dto';
import { UpdateFeeTypeDto } from './dto/fee-type/update-fee-type.dto';
import { FilterFeeTypeDto } from './dto/fee-type/filter-fee-type.dto';
import { UpdateFeePlanDto } from './dto/fee-plan/update-fee-plan.dto';
import { UpsertClassStructureDto } from './dto/fee-class-structure/upsert-class-structure.dto';
import { FilterClassStructureDto } from './dto/fee-class-structure/filter-class-structure.dto';
import { CreateTransportRouteDto } from './dto/transport-route/create-transport-route.dto';
import { UpdateTransportRouteDto } from './dto/transport-route/update-transport-route.dto';
import { UpsertRouteFeeDto } from './dto/transport-route-fee/upsert-route-fee.dto';
import { CreateFeeBillDto } from './dto/fee-bill/create-fee-bill.dto';
import { BulkCreateFeeBillDto } from './dto/fee-bill/bulk-create-fee-bill.dto';
import { FilterFeeBillDto } from './dto/fee-bill/filter-fee-bill.dto';
import { CreateFeePaymentDto } from './dto/fee-payment/create-fee-payment.dto';
import { BulkDiscountDto } from './dto/fee-discount/bulk-discount.dto';
import { BulkExtraDto } from './dto/fee-extra/bulk-extra.dto';
import { CreateFeeLateRuleDto } from './dto/fee-late-rule/create-fee-late-rule.dto';
import { UpdateFeeLateRuleDto } from './dto/fee-late-rule/update-fee-late-rule.dto';
import { GenerateDemandReceiptDto } from './dto/demand-receipt/generate-demand-receipt.dto';
import { FilterMonthlyDuesDto } from './dto/monthly-dues/filter-monthly-dues.dto';
import { GenerateStudentBillsDto } from './dto/fee-bill/generate-student-bills.dto';
import {
  FeeTypeWithHead,
  FeePlan,
  FeeClassStructureWithType,
  FeeClassStructureAllTypes,
  TransportRoute,
  TransportRouteFeeWithType,
  FeeBill,
  FeeBillWithType,
  FeeBillPayment,
  FeeLateRule,
  DemandReceiptStudent,
} from './types/fee.types';

@Injectable()
export class FeesService {
  constructor(
    private readonly feesRepo: FeesRepository,
    private readonly financeService: FinanceService,
    private readonly redisService: RedisService,
  ) {}

  private cacheKey(schoolId: string, suffix: string) {
    return `fees:${schoolId}:${suffix}`;
  }
  private invalidate(schoolId: string, prefix: string) {
    return this.redisService.delByPattern(`fees:${schoolId}:${prefix}*`);
  }

  // ─── FEE TYPES ───────────────────────────────────────────────────────────────

  async findAllFeeTypes(
    schoolId: string,
    filters: FilterFeeTypeDto,
  ): Promise<PaginationResponse<FeeTypeWithHead>> {
    const key = this.cacheKey(schoolId, `types:${JSON.stringify(filters)}`);
    return this.redisService.getOrSet(key, CacheTTL.SHORT, async () => {
      const [items, total] = await Promise.all([
        this.feesRepo.findAllFeeTypes(schoolId, filters),
        this.feesRepo.countFeeTypes(schoolId, filters),
      ]);
      return PaginationResponse.of(items, total, {
        page: Number(filters.page ?? 1),
        limit: Number(filters.limit ?? 50),
      });
    });
  }

  async findFeeTypeById(id: string, schoolId: string): Promise<FeeTypeWithHead> {
    const row = await this.feesRepo.findFeeTypeById(id, schoolId);
    if (!row) throw new NotFoundException(`Fee type '${id}' not found`);
    return row;
  }

  async createFeeType(
    dto: CreateFeeTypeDto,
    schoolId: string,
    userId: string,
  ): Promise<FeeTypeWithHead> {
    const row = await this.feesRepo.createFeeType({
      id: generateId(),
      school_id: schoolId,
      name: dto.name,
      fee_category: dto.fee_category ?? 'Class',
      frequency: dto.frequency ?? 'NA',
      applicable_months: dto.applicable_months ?? null,
      income_head_id: dto.income_head_id ?? null,
      is_active: dto.is_active ?? true,
      deleted: false,
      created_by: userId,
    });
    await this.invalidate(schoolId, 'types');
    return this.findFeeTypeById(row.id, schoolId);
  }

  async updateFeeType(
    id: string,
    schoolId: string,
    dto: UpdateFeeTypeDto,
  ): Promise<FeeTypeWithHead> {
    const row = await this.feesRepo.updateFeeType(id, schoolId, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.fee_category !== undefined && { fee_category: dto.fee_category }),
      ...(dto.frequency !== undefined && { frequency: dto.frequency }),
      ...(dto.applicable_months !== undefined && { applicable_months: dto.applicable_months }),
      ...(dto.income_head_id !== undefined && { income_head_id: dto.income_head_id }),
      ...(dto.is_active !== undefined && { is_active: dto.is_active }),
    });
    if (!row) throw new NotFoundException(`Fee type '${id}' not found`);
    await this.invalidate(schoolId, 'types');
    return this.findFeeTypeById(id, schoolId);
  }

  async deleteFeeType(id: string, schoolId: string): Promise<void> {
    await this.feesRepo.softDeleteFeeType(id, schoolId);
    await this.invalidate(schoolId, 'types');
  }

  // ─── FEE PLANS ───────────────────────────────────────────────────────────────

  async findAllFeePlans(schoolId: string): Promise<FeePlan[]> {
    const key = this.cacheKey(schoolId, 'plans');
    return this.redisService.getOrSet(key, CacheTTL.MEDIUM, () =>
      this.feesRepo.findAllFeePlans(schoolId),
    );
  }

  async seedFeePlansIfNeeded(schoolId: string, userId: string): Promise<void> {
    const count = await this.feesRepo.countFeePlansBySchool(schoolId);
    if (count > 0) return;
    const plans: Array<{ name: string; plan_type: 'Regular' | 'PromotionFree' | 'Admission' }> = [
      { name: 'Regular', plan_type: 'Regular' },
      { name: 'Promotion Free', plan_type: 'PromotionFree' },
      { name: 'Admission', plan_type: 'Admission' },
    ];
    for (const p of plans) {
      await this.feesRepo.createFeePlan({
        id: generateId(),
        school_id: schoolId,
        name: p.name,
        plan_type: p.plan_type,
        is_active: true,
        deleted: false,
        created_by: userId,
      });
    }
    await this.invalidate(schoolId, 'plans');
  }

  async updateFeePlan(id: string, schoolId: string, dto: UpdateFeePlanDto): Promise<FeePlan> {
    const row = await this.feesRepo.updateFeePlan(id, schoolId, dto);
    if (!row) throw new NotFoundException(`Fee plan '${id}' not found`);
    await this.invalidate(schoolId, 'plans');
    return row;
  }

  // ─── CLASS FEE STRUCTURES ────────────────────────────────────────────────────

  async findClassStructure(
    schoolId: string,
    dto: FilterClassStructureDto,
  ): Promise<FeeClassStructureWithType[]> {
    const key = this.cacheKey(
      schoolId,
      `structure:${dto.academic_year_id}:${dto.fee_plan_id}:${dto.class_id}`,
    );
    return this.redisService.getOrSet(key, CacheTTL.SHORT, () =>
      this.feesRepo.findClassStructure(
        schoolId,
        dto.academic_year_id,
        dto.fee_plan_id,
        dto.class_id,
      ),
    );
  }

  async findClassStructureForDisplay(
    schoolId: string,
    dto: FilterClassStructureDto,
  ): Promise<FeeClassStructureAllTypes[]> {
    return this.feesRepo.findClassStructureAllTypes(
      schoolId,
      dto.academic_year_id,
      dto.fee_plan_id,
      dto.class_id,
    );
  }

  async upsertClassStructure(
    schoolId: string,
    dto: UpsertClassStructureDto,
    userId: string,
  ): Promise<FeeClassStructureAllTypes[]> {
    for (const item of dto.items) {
      await this.feesRepo.upsertClassStructureItem({
        id: generateId(),
        school_id: schoolId,
        academic_year_id: dto.academic_year_id,
        fee_plan_id: dto.fee_plan_id,
        class_id: dto.class_id,
        fee_type_id: item.fee_type_id,
        amount: String(item.amount),
        is_enabled: item.is_enabled ?? true,
        deleted: false,
        created_by: userId,
      });
    }
    await this.invalidate(schoolId, `structure:`);
    return this.feesRepo.findClassStructureAllTypes(
      schoolId,
      dto.academic_year_id,
      dto.fee_plan_id,
      dto.class_id,
    );
  }

  // ─── TRANSPORT ROUTES ────────────────────────────────────────────────────────

  async findAllTransportRoutes(schoolId: string): Promise<TransportRoute[]> {
    const key = this.cacheKey(schoolId, 'transport-routes');
    return this.redisService.getOrSet(key, CacheTTL.MEDIUM, () =>
      this.feesRepo.findAllTransportRoutes(schoolId),
    );
  }

  async createTransportRoute(
    dto: CreateTransportRouteDto,
    schoolId: string,
    userId: string,
  ): Promise<TransportRoute> {
    const route = await this.feesRepo.createTransportRoute({
      id: generateId(),
      school_id: schoolId,
      name: dto.name,
      description: dto.description ?? null,
      is_active: true,
      deleted: false,
      created_by: userId,
    });
    await this.invalidate(schoolId, 'transport-routes');
    return route;
  }

  async updateTransportRoute(
    id: string,
    schoolId: string,
    dto: UpdateTransportRouteDto,
  ): Promise<TransportRoute> {
    const route = await this.feesRepo.updateTransportRoute(id, schoolId, dto);
    if (!route) throw new NotFoundException(`Transport route '${id}' not found`);
    await this.invalidate(schoolId, 'transport-routes');
    return route;
  }

  async deleteTransportRoute(id: string, schoolId: string): Promise<void> {
    await this.feesRepo.softDeleteTransportRoute(id, schoolId);
    await this.invalidate(schoolId, 'transport-routes');
  }

  async findRouteFees(
    routeId: string,
    schoolId: string,
    academicYearId: string,
  ): Promise<TransportRouteFeeWithType[]> {
    return this.feesRepo.findRouteFees(routeId, schoolId, academicYearId);
  }

  async upsertRouteFees(
    routeId: string,
    schoolId: string,
    dto: UpsertRouteFeeDto,
    userId: string,
  ): Promise<TransportRouteFeeWithType[]> {
    const route = await this.feesRepo.findTransportRouteById(routeId, schoolId);
    if (!route) throw new NotFoundException(`Transport route '${routeId}' not found`);
    for (const item of dto.items) {
      await this.feesRepo.upsertRouteFeeItem({
        id: generateId(),
        school_id: schoolId,
        academic_year_id: dto.academic_year_id,
        route_id: routeId,
        fee_type_id: item.fee_type_id,
        amount: String(item.amount),
        is_enabled: item.is_enabled ?? true,
        deleted: false,
        created_by: userId,
      });
    }
    return this.feesRepo.findRouteFees(routeId, schoolId, dto.academic_year_id);
  }

  // ─── FEE BILLS ───────────────────────────────────────────────────────────────

  async findBills(
    schoolId: string,
    filters: FilterFeeBillDto,
  ): Promise<PaginationResponse<FeeBillWithType>> {
    const [items, _total] = await Promise.all([
      this.feesRepo.findBills(schoolId, filters),
      // total count approximate from items for now
      Promise.resolve(0),
    ]);
    return PaginationResponse.of(items, items.length, {
      page: Number(filters.page ?? 1),
      limit: Number(filters.limit ?? 25),
    });
  }

  async findStudentBills(
    studentId: string,
    schoolId: string,
    academicYearId: string,
  ): Promise<FeeBillWithType[]> {
    return this.feesRepo.findStudentBills(studentId, schoolId, academicYearId);
  }

  async createBill(dto: CreateFeeBillDto, schoolId: string, userId: string): Promise<FeeBill> {
    return this.feesRepo.createBill({
      id: generateId(),
      school_id: schoolId,
      student_id: dto.student_id,
      academic_year_id: dto.academic_year_id,
      fee_type_id: dto.fee_type_id,
      fee_plan_id: dto.fee_plan_id ?? null,
      bill_month: dto.bill_month ?? null,
      due_date: dto.due_date ?? null,
      total_amount: String(dto.total_amount),
      discount_amount: '0',
      paid_amount: '0',
      late_fine_amount: '0',
      status: 'PENDING',
      is_manual: dto.is_manual ?? true,
      notes: dto.notes ?? null,
      deleted: false,
      created_by: userId,
    });
  }

  async bulkGenerateClassBills(
    dto: BulkCreateFeeBillDto,
    schoolId: string,
    userId: string,
  ): Promise<{ created: number }> {
    const classStudents = await this.feesRepo.findStudentsByClass(
      schoolId,
      dto.academic_year_id,
      dto.class_id,
    );
    if (classStudents.length === 0)
      throw new BadRequestException('No active students found in this class');

    // Get amount from class fee structure
    const structure = await this.feesRepo.findClassStructure(
      schoolId,
      dto.academic_year_id,
      dto.fee_plan_id,
      dto.class_id,
    );
    const structureItem = structure.find((s) => s.fee_type_id === dto.fee_type_id && s.is_enabled);
    if (!structureItem)
      throw new BadRequestException('Fee type not configured in class structure or disabled');

    let created = 0;
    for (const student of classStudents) {
      await this.feesRepo.createBill({
        id: generateId(),
        school_id: schoolId,
        student_id: student.id,
        academic_year_id: dto.academic_year_id,
        fee_type_id: dto.fee_type_id,
        fee_plan_id: dto.fee_plan_id,
        bill_month: dto.bill_month ?? null,
        due_date: dto.due_date ?? null,
        total_amount: structureItem.amount,
        discount_amount: '0',
        paid_amount: '0',
        late_fine_amount: '0',
        status: 'PENDING',
        is_manual: false,
        notes: null,
        deleted: false,
        created_by: userId,
      });
      created++;
    }
    return { created };
  }

  async payBill(
    billId: string,
    schoolId: string,
    dto: CreateFeePaymentDto,
    userId: string,
  ): Promise<FeeBillPayment> {
    const bill = await this.feesRepo.findBillById(billId, schoolId);
    if (!bill) throw new NotFoundException(`Fee bill '${billId}' not found`);
    if (bill.status === 'PAID' || bill.status === 'WAIVED') {
      throw new BadRequestException(`Bill is already ${bill.status}`);
    }
    const remaining =
      parseFloat(bill.total_amount) -
      parseFloat(bill.paid_amount) -
      parseFloat(bill.discount_amount);
    if (dto.amount > remaining + 0.01) {
      throw new BadRequestException(
        `Payment amount exceeds remaining due of ${remaining.toFixed(2)}`,
      );
    }

    let financeIncomeId: string | null = null;

    // Auto-create finance income entry if fee type has income_head_id
    if (dto.to_account_id) {
      const feeType = await this.feesRepo.findFeeTypeById(bill.fee_type_id, schoolId);
      if (feeType?.income_head_id) {
        const income = await this.financeService.createIncome(
          {
            income_head_id: feeType.income_head_id,
            to_account_id: dto.to_account_id,
            student_id: bill.student_id,
            amount: dto.amount,
            date_of_income: dto.payment_date,
            remarks: dto.remarks,
          },
          schoolId,
          userId,
        );
        financeIncomeId = income.id;
      }
    }

    const payment = await this.feesRepo.createBillPayment({
      id: generateId(),
      school_id: schoolId,
      bill_id: billId,
      amount: String(dto.amount),
      payment_mode: dto.payment_mode as 'CASH' | 'ONLINE' | 'CHEQUE' | 'DD' | 'NEFT' | 'UPI',
      to_account_id: dto.to_account_id ?? null,
      transaction_id: dto.transaction_id ?? null,
      bank_name: dto.bank_name ?? null,
      payment_date: dto.payment_date,
      finance_income_id: financeIncomeId,
      remarks: dto.remarks ?? null,
      created_by: userId,
    });

    // Update bill paid_amount and status
    const newPaid = parseFloat(bill.paid_amount) + dto.amount;
    const total = parseFloat(bill.total_amount) - parseFloat(bill.discount_amount);
    const newStatus = newPaid >= total ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'PENDING';
    await this.feesRepo.updateBill(billId, schoolId, {
      paid_amount: String(newPaid),
      status: newStatus as 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'WAIVED',
    });

    return payment;
  }

  async findBillPayments(billId: string): Promise<FeeBillPayment[]> {
    return this.feesRepo.findPaymentsByBillId(billId);
  }

  async generateBillsForStudent(
    dto: GenerateStudentBillsDto,
    schoolId: string,
    userId: string,
  ): Promise<{ created: number; skipped: number }> {
    const structure = await this.feesRepo.findClassStructure(
      schoolId,
      dto.academic_year_id,
      dto.fee_plan_id,
      dto.class_id,
    );
    const enabledItems = structure.filter((s) => s.is_enabled);
    if (!enabledItems.length)
      throw new BadRequestException('No enabled fee types in class structure');

    const academicYear = await this.feesRepo.findAcademicYearById(dto.academic_year_id);
    if (!academicYear) throw new NotFoundException('Academic year not found');

    const startYear = new Date(academicYear.start_date).getFullYear();
    const MONTH_NUM: Record<string, number> = {
      Apr: 4,
      May: 5,
      Jun: 6,
      Jul: 7,
      Aug: 8,
      Sep: 9,
      Oct: 10,
      Nov: 11,
      Dec: 12,
      Jan: 1,
      Feb: 2,
      Mar: 3,
    };

    let created = 0;
    let skipped = 0;

    for (const item of enabledItems) {
      const feeType = await this.feesRepo.findFeeTypeById(item.fee_type_id, schoolId);
      if (!feeType) continue;

      const applicableMonths = feeType.applicable_months as string[] | null;
      if (feeType.frequency === 'Monthly' && applicableMonths?.length) {
        for (const monthName of applicableMonths) {
          const monthNum = MONTH_NUM[monthName];
          if (!monthNum) continue;
          const year = monthNum >= 4 ? startYear : startYear + 1;
          const billMonth = `${year}-${String(monthNum).padStart(2, '0')}`;

          const exists = await this.feesRepo.billExistsForStudentFeeTypeMonth(
            dto.student_id,
            schoolId,
            dto.academic_year_id,
            item.fee_type_id,
            billMonth,
          );
          if (exists) {
            skipped++;
            continue;
          }

          await this.feesRepo.createBill({
            id: generateId(),
            school_id: schoolId,
            student_id: dto.student_id,
            academic_year_id: dto.academic_year_id,
            fee_type_id: item.fee_type_id,
            fee_plan_id: dto.fee_plan_id,
            bill_month: billMonth,
            due_date: null,
            total_amount: item.amount,
            discount_amount: '0',
            paid_amount: '0',
            late_fine_amount: '0',
            status: 'PENDING',
            is_manual: false,
            notes: null,
            deleted: false,
            created_by: userId,
          });
          created++;
        }
      } else {
        const exists = await this.feesRepo.billExistsForStudentFeeTypeMonth(
          dto.student_id,
          schoolId,
          dto.academic_year_id,
          item.fee_type_id,
          null,
        );
        if (exists) {
          skipped++;
          continue;
        }

        await this.feesRepo.createBill({
          id: generateId(),
          school_id: schoolId,
          student_id: dto.student_id,
          academic_year_id: dto.academic_year_id,
          fee_type_id: item.fee_type_id,
          fee_plan_id: dto.fee_plan_id,
          bill_month: null,
          due_date: null,
          total_amount: item.amount,
          discount_amount: '0',
          paid_amount: '0',
          late_fine_amount: '0',
          status: 'PENDING',
          is_manual: false,
          notes: null,
          deleted: false,
          created_by: userId,
        });
        created++;
      }
    }

    return { created, skipped };
  }

  async deletePayment(paymentId: string, schoolId: string): Promise<void> {
    const payment = await this.feesRepo.findPaymentById(paymentId, schoolId);
    if (!payment) throw new NotFoundException(`Payment '${paymentId}' not found`);

    const bill = await this.feesRepo.findBillById(payment.bill_id, schoolId);
    if (!bill) throw new NotFoundException('Associated bill not found');

    // Reverse paid amount on bill
    const newPaid = Math.max(0, parseFloat(bill.paid_amount) - parseFloat(payment.amount));
    const total = parseFloat(bill.total_amount) - parseFloat(bill.discount_amount);
    const newStatus = newPaid >= total ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'PENDING';
    await this.feesRepo.updateBill(bill.id, schoolId, {
      paid_amount: String(newPaid),
      status: newStatus as 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'WAIVED',
    });

    // Reverse linked finance income if present
    if (payment.finance_income_id) {
      try {
        await this.financeService.removeIncome(payment.finance_income_id, schoolId);
      } catch {
        /* income may already be deleted */
      }
    }

    await this.feesRepo.deletePayment(paymentId);
  }

  // ─── MONTHLY DUES ────────────────────────────────────────────────────────────

  async findMonthlyDues(schoolId: string, dto: FilterMonthlyDuesDto) {
    return this.feesRepo.findMonthlyDuesByClass(
      schoolId,
      dto.academic_year_id,
      dto.class_id,
      dto.month,
    );
  }

  // ─── BULK DISCOUNT ───────────────────────────────────────────────────────────

  async applyBulkDiscount(
    schoolId: string,
    dto: BulkDiscountDto,
    userId: string,
  ): Promise<{ applied: number }> {
    let studentIds = dto.student_ids ?? [];
    if (!studentIds.length && dto.class_id) {
      const classStudents = await this.feesRepo.findStudentsByClass(
        schoolId,
        dto.academic_year_id,
        dto.class_id,
      );
      studentIds = classStudents.map((s) => s.id);
    }
    if (!studentIds.length) throw new BadRequestException('No students selected');

    let applied = 0;
    for (const studentId of studentIds) {
      const bills = await this.feesRepo.findBillsByStudentAndFeeType(
        studentId,
        schoolId,
        dto.academic_year_id,
        dto.fee_type_id,
      );
      for (const bill of bills) {
        if (bill.status === 'PAID' || bill.status === 'WAIVED') continue;
        const newDiscount = parseFloat(bill.discount_amount) + dto.discount_amount;
        await this.feesRepo.updateBill(bill.id, schoolId, { discount_amount: String(newDiscount) });
        await this.feesRepo.createDiscount({
          id: generateId(),
          school_id: schoolId,
          student_id: studentId,
          bill_id: bill.id,
          fee_type_id: dto.fee_type_id,
          academic_year_id: dto.academic_year_id,
          discount_amount: String(dto.discount_amount),
          reason: dto.reason ?? null,
          applied_by: userId,
        });
        applied++;
      }
    }
    return { applied };
  }

  // ─── BULK EXTRA ──────────────────────────────────────────────────────────────

  async applyBulkExtra(
    schoolId: string,
    dto: BulkExtraDto,
    userId: string,
  ): Promise<{ created: number }> {
    let studentIds = dto.student_ids ?? [];
    if (!studentIds.length && dto.class_id) {
      const classStudents = await this.feesRepo.findStudentsByClass(
        schoolId,
        dto.academic_year_id,
        dto.class_id,
      );
      studentIds = classStudents.map((s) => s.id);
    }
    if (!studentIds.length) throw new BadRequestException('No students selected');

    let created = 0;
    for (const studentId of studentIds) {
      await this.feesRepo.createBill({
        id: generateId(),
        school_id: schoolId,
        student_id: studentId,
        academic_year_id: dto.academic_year_id,
        fee_type_id: dto.fee_type_id,
        fee_plan_id: null,
        bill_month: dto.bill_month ?? null,
        due_date: null,
        total_amount: String(dto.amount),
        discount_amount: '0',
        paid_amount: '0',
        late_fine_amount: '0',
        status: 'PENDING',
        is_manual: true,
        notes: dto.notes ?? null,
        deleted: false,
        created_by: userId,
      });
      created++;
    }
    return { created };
  }

  // ─── LATE RULES ──────────────────────────────────────────────────────────────

  async findAllLateRules(schoolId: string, academicYearId?: string): Promise<FeeLateRule[]> {
    return this.feesRepo.findAllLateRules(schoolId, academicYearId);
  }

  async createLateRule(
    dto: CreateFeeLateRuleDto,
    schoolId: string,
    userId: string,
  ): Promise<FeeLateRule> {
    return this.feesRepo.createLateRule({
      id: generateId(),
      school_id: schoolId,
      name: dto.name,
      academic_year_id: dto.academic_year_id,
      applicable_fee_type_ids: dto.applicable_fee_type_ids,
      late_fine_fee_type_id: dto.late_fine_fee_type_id ?? null,
      late_fee_amount: String(dto.late_fee_amount),
      days_after_due: dto.days_after_due,
      start_from_current_month: dto.start_from_current_month ?? true,
      is_enabled: dto.is_enabled ?? true,
      deleted: false,
      created_by: userId,
    });
  }

  async updateLateRule(
    id: string,
    schoolId: string,
    dto: UpdateFeeLateRuleDto,
  ): Promise<FeeLateRule> {
    const row = await this.feesRepo.updateLateRule(id, schoolId, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.applicable_fee_type_ids !== undefined && {
        applicable_fee_type_ids: dto.applicable_fee_type_ids,
      }),
      ...(dto.late_fine_fee_type_id !== undefined && {
        late_fine_fee_type_id: dto.late_fine_fee_type_id,
      }),
      ...(dto.late_fee_amount !== undefined && { late_fee_amount: String(dto.late_fee_amount) }),
      ...(dto.days_after_due !== undefined && { days_after_due: dto.days_after_due }),
      ...(dto.start_from_current_month !== undefined && {
        start_from_current_month: dto.start_from_current_month,
      }),
      ...(dto.is_enabled !== undefined && { is_enabled: dto.is_enabled }),
    });
    if (!row) throw new NotFoundException(`Late rule '${id}' not found`);
    return row;
  }

  async deleteLateRule(id: string, schoolId: string): Promise<void> {
    await this.feesRepo.softDeleteLateRule(id, schoolId);
  }

  // ─── DEMAND RECEIPT ──────────────────────────────────────────────────────────

  async getDemandReceipt(
    schoolId: string,
    dto: GenerateDemandReceiptDto,
  ): Promise<DemandReceiptStudent[]> {
    return this.feesRepo.findBillsForDemandReceipt(
      schoolId,
      dto.academic_year_id,
      dto.class_id,
      dto.month_from,
      dto.month_to,
    );
  }
}
