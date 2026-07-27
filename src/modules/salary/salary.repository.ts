import { Injectable, Inject } from '@nestjs/common';
import { and, eq, desc, sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { generateId } from '../../utils/uuid.utils';
import {
  salaryHeads,
  salaryStructureTemplates,
  salaryStructureItems,
  employeeSalaryAssignments,
  salaryTransactions,
} from '../../database/drizzle/schema';
import {
  SalaryHead,
  NewSalaryHead,
  SalaryStructureTemplate,
  NewSalaryStructureTemplate,
  NewSalaryStructureItem,
  EmployeeSalaryAssignment,
  NewEmployeeSalaryAssignment,
  SalaryTransaction,
  NewSalaryTransaction,
  SalaryStructureItemWithHead,
  SalaryTemplateWithItems,
  SalaryAssignmentWithRelations,
  SalaryTransactionWithRelations,
} from './types/salary.types';
import { FilterSalaryHeadDto, FilterSalaryTransactionDto } from './dto/filter-salary.dto';
import { financeAccounts, financeHeads } from '../../database/drizzle/schema';

@Injectable()
export class SalaryRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  // ─── HEADS ──────────────────────────────────────────────────────────────────

  async findAllHeads(schoolId: string, filters: FilterSalaryHeadDto): Promise<SalaryHead[]> {
    const conditions = [eq(salaryHeads.school_id, schoolId), eq(salaryHeads.deleted, false)];
    if (filters.head_type) conditions.push(eq(salaryHeads.head_type, filters.head_type));
    if (filters.is_enabled !== undefined)
      conditions.push(eq(salaryHeads.is_enabled, filters.is_enabled));
    const limit = Number(filters.limit ?? 50);
    const offset = (Number(filters.page ?? 1) - 1) * limit;
    return this.db
      .select()
      .from(salaryHeads)
      .where(and(...conditions))
      .orderBy(salaryHeads.name)
      .limit(limit)
      .offset(offset);
  }

  async countHeads(schoolId: string, filters: FilterSalaryHeadDto): Promise<number> {
    const conditions = [eq(salaryHeads.school_id, schoolId), eq(salaryHeads.deleted, false)];
    if (filters.head_type) conditions.push(eq(salaryHeads.head_type, filters.head_type));
    if (filters.is_enabled !== undefined)
      conditions.push(eq(salaryHeads.is_enabled, filters.is_enabled));
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(salaryHeads)
      .where(and(...conditions));
    return Number(count);
  }

  async findHeadById(id: string, schoolId: string): Promise<SalaryHead | undefined> {
    const [row] = await this.db
      .select()
      .from(salaryHeads)
      .where(
        and(
          eq(salaryHeads.id, id),
          eq(salaryHeads.school_id, schoolId),
          eq(salaryHeads.deleted, false),
        ),
      );
    return row;
  }

  async createHead(data: NewSalaryHead): Promise<SalaryHead> {
    const [row] = await this.db.insert(salaryHeads).values(data).returning();
    return row;
  }

  async updateHead(
    id: string,
    schoolId: string,
    data: Partial<NewSalaryHead>,
  ): Promise<SalaryHead | undefined> {
    const [row] = await this.db
      .update(salaryHeads)
      .set({ ...data, updated_at: new Date() })
      .where(and(eq(salaryHeads.id, id), eq(salaryHeads.school_id, schoolId)))
      .returning();
    return row;
  }

  async softDeleteHead(id: string, schoolId: string): Promise<void> {
    await this.db
      .update(salaryHeads)
      .set({ deleted: true, is_enabled: false, updated_at: new Date() })
      .where(and(eq(salaryHeads.id, id), eq(salaryHeads.school_id, schoolId)));
  }

  // ─── TEMPLATES ──────────────────────────────────────────────────────────────

  async findAllTemplates(schoolId: string): Promise<SalaryTemplateWithItems[]> {
    const templates = await this.db
      .select()
      .from(salaryStructureTemplates)
      .where(
        and(
          eq(salaryStructureTemplates.school_id, schoolId),
          eq(salaryStructureTemplates.deleted, false),
        ),
      )
      .orderBy(salaryStructureTemplates.name);
    const result: SalaryTemplateWithItems[] = [];
    for (const tpl of templates) {
      const items = await this.getTemplateItems(tpl.id);
      result.push({ ...tpl, items });
    }
    return result;
  }

  async findTemplateById(
    id: string,
    schoolId: string,
  ): Promise<SalaryTemplateWithItems | undefined> {
    const [tpl] = await this.db
      .select()
      .from(salaryStructureTemplates)
      .where(
        and(
          eq(salaryStructureTemplates.id, id),
          eq(salaryStructureTemplates.school_id, schoolId),
          eq(salaryStructureTemplates.deleted, false),
        ),
      );
    if (!tpl) return undefined;
    const items = await this.getTemplateItems(id);
    return { ...tpl, items };
  }

  async getTemplateItems(templateId: string): Promise<SalaryStructureItemWithHead[]> {
    const rows = await this.db
      .select({
        id: salaryStructureItems.id,
        template_id: salaryStructureItems.template_id,
        salary_head_id: salaryStructureItems.salary_head_id,
        default_amount: salaryStructureItems.default_amount,
        created_at: salaryStructureItems.created_at,
        head_name: salaryHeads.name,
        head_type: salaryHeads.head_type,
        head_code: salaryHeads.code,
      })
      .from(salaryStructureItems)
      .leftJoin(salaryHeads, eq(salaryStructureItems.salary_head_id, salaryHeads.id))
      .where(eq(salaryStructureItems.template_id, templateId));
    return rows as SalaryStructureItemWithHead[];
  }

  async createTemplate(data: NewSalaryStructureTemplate): Promise<SalaryStructureTemplate> {
    const [row] = await this.db.insert(salaryStructureTemplates).values(data).returning();
    return row;
  }

  async updateTemplate(
    id: string,
    schoolId: string,
    data: Partial<NewSalaryStructureTemplate>,
  ): Promise<SalaryStructureTemplate | undefined> {
    const [row] = await this.db
      .update(salaryStructureTemplates)
      .set({ ...data, updated_at: new Date() })
      .where(
        and(eq(salaryStructureTemplates.id, id), eq(salaryStructureTemplates.school_id, schoolId)),
      )
      .returning();
    return row;
  }

  async softDeleteTemplate(id: string, schoolId: string): Promise<void> {
    await this.db
      .update(salaryStructureTemplates)
      .set({ deleted: true, is_enabled: false, updated_at: new Date() })
      .where(
        and(eq(salaryStructureTemplates.id, id), eq(salaryStructureTemplates.school_id, schoolId)),
      );
  }

  async replaceTemplateItems(
    templateId: string,
    items: Omit<NewSalaryStructureItem, 'id' | 'created_at'>[],
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.delete(salaryStructureItems).where(eq(salaryStructureItems.template_id, templateId));
      if (items.length) {
        await tx.insert(salaryStructureItems).values(items.map((i) => ({ ...i, id: generateId() })));
      }
    });
  }

  // ─── ASSIGNMENTS ─────────────────────────────────────────────────────────────

  async findAssignmentsByEmployee(
    schoolId: string,
    employeeId: string,
  ): Promise<SalaryAssignmentWithRelations[]> {
    const rows = await this.db
      .select({
        id: employeeSalaryAssignments.id,
        school_id: employeeSalaryAssignments.school_id,
        employee_id: employeeSalaryAssignments.employee_id,
        template_id: employeeSalaryAssignments.template_id,
        effective_from: employeeSalaryAssignments.effective_from,
        remarks: employeeSalaryAssignments.remarks,
        is_active: employeeSalaryAssignments.is_active,
        created_by: employeeSalaryAssignments.created_by,
        created_at: employeeSalaryAssignments.created_at,
        updated_at: employeeSalaryAssignments.updated_at,
        template_name: salaryStructureTemplates.name,
      })
      .from(employeeSalaryAssignments)
      .leftJoin(
        salaryStructureTemplates,
        eq(employeeSalaryAssignments.template_id, salaryStructureTemplates.id),
      )
      .where(
        and(
          eq(employeeSalaryAssignments.school_id, schoolId),
          eq(employeeSalaryAssignments.employee_id, employeeId),
        ),
      )
      .orderBy(desc(employeeSalaryAssignments.created_at));

    const result: SalaryAssignmentWithRelations[] = [];
    for (const row of rows) {
      const items = await this.getTemplateItems(row.template_id);
      result.push({ ...row, template_name: row.template_name ?? '', items });
    }
    return result;
  }

  async findAllAssignments(schoolId: string): Promise<SalaryAssignmentWithRelations[]> {
    const rows = await this.db
      .select({
        id: employeeSalaryAssignments.id,
        school_id: employeeSalaryAssignments.school_id,
        employee_id: employeeSalaryAssignments.employee_id,
        template_id: employeeSalaryAssignments.template_id,
        effective_from: employeeSalaryAssignments.effective_from,
        remarks: employeeSalaryAssignments.remarks,
        is_active: employeeSalaryAssignments.is_active,
        created_by: employeeSalaryAssignments.created_by,
        created_at: employeeSalaryAssignments.created_at,
        updated_at: employeeSalaryAssignments.updated_at,
        template_name: salaryStructureTemplates.name,
      })
      .from(employeeSalaryAssignments)
      .leftJoin(
        salaryStructureTemplates,
        eq(employeeSalaryAssignments.template_id, salaryStructureTemplates.id),
      )
      .where(eq(employeeSalaryAssignments.school_id, schoolId))
      .orderBy(desc(employeeSalaryAssignments.created_at));

    const result: SalaryAssignmentWithRelations[] = [];
    for (const row of rows) {
      const items = await this.getTemplateItems(row.template_id);
      result.push({ ...row, template_name: row.template_name ?? '', items });
    }
    return result;
  }

  async createAssignment(data: NewEmployeeSalaryAssignment): Promise<EmployeeSalaryAssignment> {
    const [row] = await this.db.insert(employeeSalaryAssignments).values(data).returning();
    return row;
  }

  async deactivateAssignment(id: string, schoolId: string): Promise<void> {
    await this.db
      .update(employeeSalaryAssignments)
      .set({ is_active: false, updated_at: new Date() })
      .where(
        and(
          eq(employeeSalaryAssignments.id, id),
          eq(employeeSalaryAssignments.school_id, schoolId),
        ),
      );
  }

  // ─── TRANSACTIONS ────────────────────────────────────────────────────────────

  async findAllTransactions(
    schoolId: string,
    filters: FilterSalaryTransactionDto,
  ): Promise<SalaryTransactionWithRelations[]> {
    const conditions = [
      eq(salaryTransactions.school_id, schoolId),
      eq(salaryTransactions.deleted, false),
    ];
    if (filters.employee_id)
      conditions.push(eq(salaryTransactions.employee_id, filters.employee_id));
    if (filters.salary_month)
      conditions.push(eq(salaryTransactions.salary_month, filters.salary_month));
    if (filters.status) conditions.push(eq(salaryTransactions.status, filters.status));
    const limit = Number(filters.limit ?? 25);
    const offset = (Number(filters.page ?? 1) - 1) * limit;

    const rows = await this.db
      .select({
        id: salaryTransactions.id,
        school_id: salaryTransactions.school_id,
        employee_id: salaryTransactions.employee_id,
        salary_month: salaryTransactions.salary_month,
        total_amount: salaryTransactions.total_amount,
        payment_mode: salaryTransactions.payment_mode,
        payment_release_date: salaryTransactions.payment_release_date,
        deduction_amount: salaryTransactions.deduction_amount,
        from_account_id: salaryTransactions.from_account_id,
        expense_head_id: salaryTransactions.expense_head_id,
        finance_expense_id: salaryTransactions.finance_expense_id,
        remarks: salaryTransactions.remarks,
        status: salaryTransactions.status,
        deleted: salaryTransactions.deleted,
        created_by: salaryTransactions.created_by,
        created_at: salaryTransactions.created_at,
        updated_at: salaryTransactions.updated_at,
        from_account_name: financeAccounts.name,
        expense_head_name: financeHeads.name,
      })
      .from(salaryTransactions)
      .leftJoin(financeAccounts, eq(salaryTransactions.from_account_id, financeAccounts.id))
      .leftJoin(financeHeads, eq(salaryTransactions.expense_head_id, financeHeads.id))
      .where(and(...conditions))
      .orderBy(desc(salaryTransactions.created_at))
      .limit(limit)
      .offset(offset);

    return rows;
  }

  async countTransactions(schoolId: string, filters: FilterSalaryTransactionDto): Promise<number> {
    const conditions = [
      eq(salaryTransactions.school_id, schoolId),
      eq(salaryTransactions.deleted, false),
    ];
    if (filters.employee_id)
      conditions.push(eq(salaryTransactions.employee_id, filters.employee_id));
    if (filters.salary_month)
      conditions.push(eq(salaryTransactions.salary_month, filters.salary_month));
    if (filters.status) conditions.push(eq(salaryTransactions.status, filters.status));
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(salaryTransactions)
      .where(and(...conditions));
    return Number(count);
  }

  async findTransactionById(id: string, schoolId: string): Promise<SalaryTransaction | undefined> {
    const [row] = await this.db
      .select()
      .from(salaryTransactions)
      .where(
        and(
          eq(salaryTransactions.id, id),
          eq(salaryTransactions.school_id, schoolId),
          eq(salaryTransactions.deleted, false),
        ),
      );
    return row;
  }

  async createTransaction(data: NewSalaryTransaction): Promise<SalaryTransaction> {
    const [row] = await this.db.insert(salaryTransactions).values(data).returning();
    return row;
  }

  async updateTransactionStatus(
    id: string,
    schoolId: string,
    status: string,
  ): Promise<SalaryTransaction | undefined> {
    const [row] = await this.db
      .update(salaryTransactions)
      .set({ status, updated_at: new Date() })
      .where(and(eq(salaryTransactions.id, id), eq(salaryTransactions.school_id, schoolId)))
      .returning();
    return row;
  }

  async softDeleteTransaction(id: string, schoolId: string): Promise<void> {
    await this.db
      .update(salaryTransactions)
      .set({ deleted: true, updated_at: new Date() })
      .where(and(eq(salaryTransactions.id, id), eq(salaryTransactions.school_id, schoolId)));
  }

  async linkFinanceExpense(
    id: string,
    schoolId: string,
    financeExpenseId: string,
  ): Promise<void> {
    await this.db
      .update(salaryTransactions)
      .set({ finance_expense_id: financeExpenseId, updated_at: new Date() })
      .where(and(eq(salaryTransactions.id, id), eq(salaryTransactions.school_id, schoolId)));
  }
}
