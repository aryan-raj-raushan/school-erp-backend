import { Injectable, Inject } from '@nestjs/common';
import { eq, and, sql, gte, lte, lt, desc, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { financeAccounts } from '../../database/drizzle/schema/finance-accounts.schema';
import { financeHeads } from '../../database/drizzle/schema/finance-heads.schema';
import { financeExpenses } from '../../database/drizzle/schema/finance-expenses.schema';
import { financeIncome } from '../../database/drizzle/schema/finance-income.schema';
import { financeTransfers } from '../../database/drizzle/schema/finance-transfers.schema';
import {
  FinanceAccount,
  NewFinanceAccount,
  FinanceHead,
  NewFinanceHead,
  FinanceExpense,
  NewFinanceExpense,
  FinanceIncomeRecord,
  NewFinanceIncomeRecord,
  FinanceTransfer,
  NewFinanceTransfer,
  FinanceExpenseWithRelations,
  FinanceIncomeWithRelations,
  FinanceTransferWithRelations,
  StatementEntry,
  RegisterEntry,
} from './types/finance.types';
import { FilterFinanceAccountDto } from './dto/filter-finance-account.dto';
import { FilterFinanceHeadDto } from './dto/filter-finance-head.dto';
import { FilterTransactionsDto } from './dto/filter-transactions.dto';

@Injectable()
export class FinanceRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  // ─── ACCOUNTS ───────────────────────────────────────────────────────────────

  async findAllAccounts(
    schoolId: string,
    filters: FilterFinanceAccountDto,
  ): Promise<FinanceAccount[]> {
    const conditions = [
      eq(financeAccounts.school_id, schoolId),
      eq(financeAccounts.deleted, false),
    ];
    if (filters.is_enabled !== undefined)
      conditions.push(eq(financeAccounts.is_enabled, filters.is_enabled));
    const limit = filters.limit ?? 20;
    const offset = ((filters.page ?? 1) - 1) * limit;
    return this.db
      .select()
      .from(financeAccounts)
      .where(and(...conditions))
      .orderBy(financeAccounts.name)
      .limit(limit)
      .offset(offset);
  }

  async countAccounts(schoolId: string, filters: FilterFinanceAccountDto): Promise<number> {
    const conditions = [
      eq(financeAccounts.school_id, schoolId),
      eq(financeAccounts.deleted, false),
    ];
    if (filters.is_enabled !== undefined)
      conditions.push(eq(financeAccounts.is_enabled, filters.is_enabled));
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(financeAccounts)
      .where(and(...conditions));
    return Number(count);
  }

  async findAccountById(id: string, schoolId: string): Promise<FinanceAccount | undefined> {
    const [row] = await this.db
      .select()
      .from(financeAccounts)
      .where(
        and(
          eq(financeAccounts.id, id),
          eq(financeAccounts.school_id, schoolId),
          eq(financeAccounts.deleted, false),
        ),
      );
    return row;
  }

  async createAccount(data: NewFinanceAccount): Promise<FinanceAccount> {
    const [row] = await this.db.insert(financeAccounts).values(data).returning();
    return row;
  }

  async updateAccount(
    id: string,
    schoolId: string,
    data: Partial<NewFinanceAccount>,
  ): Promise<FinanceAccount | undefined> {
    const [row] = await this.db
      .update(financeAccounts)
      .set({ ...data, updated_at: new Date() })
      .where(and(eq(financeAccounts.id, id), eq(financeAccounts.school_id, schoolId)))
      .returning();
    return row;
  }

  async softDeleteAccount(id: string, schoolId: string): Promise<void> {
    await this.db
      .update(financeAccounts)
      .set({ deleted: true, is_enabled: false, updated_at: new Date() })
      .where(and(eq(financeAccounts.id, id), eq(financeAccounts.school_id, schoolId)));
  }

  // ─── HEADS ──────────────────────────────────────────────────────────────────

  async findAllHeads(schoolId: string, filters: FilterFinanceHeadDto): Promise<FinanceHead[]> {
    const conditions = [eq(financeHeads.school_id, schoolId), eq(financeHeads.deleted, false)];
    if (filters.is_enabled !== undefined)
      conditions.push(eq(financeHeads.is_enabled, filters.is_enabled));
    if (filters.head_type) conditions.push(eq(financeHeads.head_type, filters.head_type));
    const limit = filters.limit ?? 20;
    const offset = ((filters.page ?? 1) - 1) * limit;
    return this.db
      .select()
      .from(financeHeads)
      .where(and(...conditions))
      .orderBy(financeHeads.name)
      .limit(limit)
      .offset(offset);
  }

  async countHeads(schoolId: string, filters: FilterFinanceHeadDto): Promise<number> {
    const conditions = [eq(financeHeads.school_id, schoolId), eq(financeHeads.deleted, false)];
    if (filters.is_enabled !== undefined)
      conditions.push(eq(financeHeads.is_enabled, filters.is_enabled));
    if (filters.head_type) conditions.push(eq(financeHeads.head_type, filters.head_type));
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(financeHeads)
      .where(and(...conditions));
    return Number(count);
  }

  async findHeadById(id: string, schoolId: string): Promise<FinanceHead | undefined> {
    const [row] = await this.db
      .select()
      .from(financeHeads)
      .where(
        and(
          eq(financeHeads.id, id),
          eq(financeHeads.school_id, schoolId),
          eq(financeHeads.deleted, false),
        ),
      );
    return row;
  }

  async createHead(data: NewFinanceHead): Promise<FinanceHead> {
    const [row] = await this.db.insert(financeHeads).values(data).returning();
    return row;
  }

  async updateHead(
    id: string,
    schoolId: string,
    data: Partial<NewFinanceHead>,
  ): Promise<FinanceHead | undefined> {
    const [row] = await this.db
      .update(financeHeads)
      .set({ ...data, updated_at: new Date() })
      .where(and(eq(financeHeads.id, id), eq(financeHeads.school_id, schoolId)))
      .returning();
    return row;
  }

  async softDeleteHead(id: string, schoolId: string): Promise<void> {
    await this.db
      .update(financeHeads)
      .set({ deleted: true, is_enabled: false, updated_at: new Date() })
      .where(and(eq(financeHeads.id, id), eq(financeHeads.school_id, schoolId)));
  }

  // ─── EXPENSES ───────────────────────────────────────────────────────────────

  async findAllExpenses(
    schoolId: string,
    filters: FilterTransactionsDto,
  ): Promise<FinanceExpenseWithRelations[]> {
    const conditions = [
      eq(financeExpenses.school_id, schoolId),
      eq(financeExpenses.deleted, false),
    ];
    if (filters.account_id)
      conditions.push(eq(financeExpenses.from_account_id, filters.account_id));
    if (filters.head_id) conditions.push(eq(financeExpenses.expense_head_id, filters.head_id));
    if (filters.start_date)
      conditions.push(gte(financeExpenses.date_of_expense, filters.start_date));
    if (filters.end_date) conditions.push(lte(financeExpenses.date_of_expense, filters.end_date));
    const limit = filters.limit ?? 25;
    const offset = ((filters.page ?? 1) - 1) * limit;
    const rows = await this.db
      .select({
        id: financeExpenses.id,
        school_id: financeExpenses.school_id,
        expense_head_id: financeExpenses.expense_head_id,
        from_account_id: financeExpenses.from_account_id,
        employee_id: financeExpenses.employee_id,
        total_amount: financeExpenses.total_amount,
        date_of_expense: financeExpenses.date_of_expense,
        remarks: financeExpenses.remarks,
        created_by: financeExpenses.created_by,
        created_at: financeExpenses.created_at,
        updated_at: financeExpenses.updated_at,
        deleted: financeExpenses.deleted,
        expense_head_name: financeHeads.name,
        from_account_name: financeAccounts.name,
      })
      .from(financeExpenses)
      .leftJoin(financeHeads, eq(financeExpenses.expense_head_id, financeHeads.id))
      .leftJoin(financeAccounts, eq(financeExpenses.from_account_id, financeAccounts.id))
      .where(and(...conditions))
      .orderBy(desc(financeExpenses.created_at))
      .limit(limit)
      .offset(offset);
    return rows;
  }

  async countExpenses(schoolId: string, filters: FilterTransactionsDto): Promise<number> {
    const conditions = [
      eq(financeExpenses.school_id, schoolId),
      eq(financeExpenses.deleted, false),
    ];
    if (filters.account_id)
      conditions.push(eq(financeExpenses.from_account_id, filters.account_id));
    if (filters.head_id) conditions.push(eq(financeExpenses.expense_head_id, filters.head_id));
    if (filters.start_date)
      conditions.push(gte(financeExpenses.date_of_expense, filters.start_date));
    if (filters.end_date) conditions.push(lte(financeExpenses.date_of_expense, filters.end_date));
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(financeExpenses)
      .where(and(...conditions));
    return Number(count);
  }

  async findExpenseById(id: string, schoolId: string): Promise<FinanceExpense | undefined> {
    const [row] = await this.db
      .select()
      .from(financeExpenses)
      .where(
        and(
          eq(financeExpenses.id, id),
          eq(financeExpenses.school_id, schoolId),
          eq(financeExpenses.deleted, false),
        ),
      );
    return row;
  }

  /** Inserts the expense and debits the account atomically. */
  async createExpenseAndDebit(data: NewFinanceExpense): Promise<FinanceExpense> {
    return this.db.transaction(async (tx) => {
      const [expense] = await tx.insert(financeExpenses).values(data).returning();
      await tx
        .update(financeAccounts)
        .set({
          current_balance: sql`${financeAccounts.current_balance} - ${data.total_amount}::numeric`,
          updated_at: new Date(),
        })
        .where(eq(financeAccounts.id, data.from_account_id));
      return expense;
    });
  }

  /** Soft-deletes the expense and credits the account back atomically. */
  async softDeleteExpenseAndCredit(
    id: string,
    schoolId: string,
  ): Promise<FinanceExpense | undefined> {
    return this.db.transaction(async (tx) => {
      const [expense] = await tx
        .update(financeExpenses)
        .set({ deleted: true, updated_at: new Date() })
        .where(and(eq(financeExpenses.id, id), eq(financeExpenses.school_id, schoolId)))
        .returning();
      if (!expense) return expense;
      await tx
        .update(financeAccounts)
        .set({
          current_balance: sql`${financeAccounts.current_balance} + ${expense.total_amount}::numeric`,
          updated_at: new Date(),
        })
        .where(eq(financeAccounts.id, expense.from_account_id));
      return expense;
    });
  }

  // ─── INCOME ─────────────────────────────────────────────────────────────────

  async findAllIncome(
    schoolId: string,
    filters: FilterTransactionsDto,
  ): Promise<FinanceIncomeWithRelations[]> {
    const conditions = [eq(financeIncome.school_id, schoolId), eq(financeIncome.deleted, false)];
    if (filters.account_id) conditions.push(eq(financeIncome.to_account_id, filters.account_id));
    if (filters.head_id) conditions.push(eq(financeIncome.income_head_id, filters.head_id));
    if (filters.start_date) conditions.push(gte(financeIncome.date_of_income, filters.start_date));
    if (filters.end_date) conditions.push(lte(financeIncome.date_of_income, filters.end_date));
    const limit = filters.limit ?? 25;
    const offset = ((filters.page ?? 1) - 1) * limit;
    const rows = await this.db
      .select({
        id: financeIncome.id,
        school_id: financeIncome.school_id,
        income_head_id: financeIncome.income_head_id,
        to_account_id: financeIncome.to_account_id,
        student_id: financeIncome.student_id,
        amount: financeIncome.amount,
        date_of_income: financeIncome.date_of_income,
        remarks: financeIncome.remarks,
        created_by: financeIncome.created_by,
        created_at: financeIncome.created_at,
        updated_at: financeIncome.updated_at,
        deleted: financeIncome.deleted,
        income_head_name: financeHeads.name,
        to_account_name: financeAccounts.name,
      })
      .from(financeIncome)
      .leftJoin(financeHeads, eq(financeIncome.income_head_id, financeHeads.id))
      .leftJoin(financeAccounts, eq(financeIncome.to_account_id, financeAccounts.id))
      .where(and(...conditions))
      .orderBy(desc(financeIncome.created_at))
      .limit(limit)
      .offset(offset);
    return rows;
  }

  async countIncome(schoolId: string, filters: FilterTransactionsDto): Promise<number> {
    const conditions = [eq(financeIncome.school_id, schoolId), eq(financeIncome.deleted, false)];
    if (filters.account_id) conditions.push(eq(financeIncome.to_account_id, filters.account_id));
    if (filters.head_id) conditions.push(eq(financeIncome.income_head_id, filters.head_id));
    if (filters.start_date) conditions.push(gte(financeIncome.date_of_income, filters.start_date));
    if (filters.end_date) conditions.push(lte(financeIncome.date_of_income, filters.end_date));
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(financeIncome)
      .where(and(...conditions));
    return Number(count);
  }

  async findIncomeById(id: string, schoolId: string): Promise<FinanceIncomeRecord | undefined> {
    const [row] = await this.db
      .select()
      .from(financeIncome)
      .where(
        and(
          eq(financeIncome.id, id),
          eq(financeIncome.school_id, schoolId),
          eq(financeIncome.deleted, false),
        ),
      );
    return row;
  }

  /** Inserts the income and credits the account atomically. */
  async createIncomeAndCredit(data: NewFinanceIncomeRecord): Promise<FinanceIncomeRecord> {
    return this.db.transaction(async (tx) => {
      const [income] = await tx.insert(financeIncome).values(data).returning();
      await tx
        .update(financeAccounts)
        .set({
          current_balance: sql`${financeAccounts.current_balance} + ${data.amount}::numeric`,
          updated_at: new Date(),
        })
        .where(eq(financeAccounts.id, data.to_account_id));
      return income;
    });
  }

  /** Soft-deletes the income and debits the account back atomically. */
  async softDeleteIncomeAndDebit(
    id: string,
    schoolId: string,
  ): Promise<FinanceIncomeRecord | undefined> {
    return this.db.transaction(async (tx) => {
      const [income] = await tx
        .update(financeIncome)
        .set({ deleted: true, updated_at: new Date() })
        .where(and(eq(financeIncome.id, id), eq(financeIncome.school_id, schoolId)))
        .returning();
      if (!income) return income;
      await tx
        .update(financeAccounts)
        .set({
          current_balance: sql`${financeAccounts.current_balance} - ${income.amount}::numeric`,
          updated_at: new Date(),
        })
        .where(eq(financeAccounts.id, income.to_account_id));
      return income;
    });
  }

  // ─── TRANSFERS ──────────────────────────────────────────────────────────────

  async findAllTransfers(
    schoolId: string,
    filters: FilterTransactionsDto,
  ): Promise<FinanceTransferWithRelations[]> {
    const conditions = [
      eq(financeTransfers.school_id, schoolId),
      eq(financeTransfers.deleted, false),
    ];
    if (filters.account_id) {
      conditions.push(
        or(
          eq(financeTransfers.from_account_id, filters.account_id),
          eq(financeTransfers.to_account_id, filters.account_id),
        )!,
      );
    }
    if (filters.start_date)
      conditions.push(gte(financeTransfers.date_of_transaction, filters.start_date));
    if (filters.end_date)
      conditions.push(lte(financeTransfers.date_of_transaction, filters.end_date));
    const limit = filters.limit ?? 25;
    const offset = ((filters.page ?? 1) - 1) * limit;
    const fromAcc = alias(financeAccounts, 'from_acc');
    const toAcc = alias(financeAccounts, 'to_acc');
    const rows = await this.db
      .select({
        id: financeTransfers.id,
        school_id: financeTransfers.school_id,
        from_account_id: financeTransfers.from_account_id,
        to_account_id: financeTransfers.to_account_id,
        amount: financeTransfers.amount,
        date_of_transaction: financeTransfers.date_of_transaction,
        remarks: financeTransfers.remarks,
        created_by: financeTransfers.created_by,
        created_at: financeTransfers.created_at,
        updated_at: financeTransfers.updated_at,
        deleted: financeTransfers.deleted,
        from_account_name: fromAcc.name,
        to_account_name: toAcc.name,
      })
      .from(financeTransfers)
      .leftJoin(fromAcc, eq(financeTransfers.from_account_id, fromAcc.id))
      .leftJoin(toAcc, eq(financeTransfers.to_account_id, toAcc.id))
      .where(and(...conditions))
      .orderBy(desc(financeTransfers.created_at))
      .limit(limit)
      .offset(offset);
    return rows as FinanceTransferWithRelations[];
  }

  async countTransfers(schoolId: string, filters: FilterTransactionsDto): Promise<number> {
    const conditions = [
      eq(financeTransfers.school_id, schoolId),
      eq(financeTransfers.deleted, false),
    ];
    if (filters.account_id) {
      conditions.push(
        or(
          eq(financeTransfers.from_account_id, filters.account_id),
          eq(financeTransfers.to_account_id, filters.account_id),
        )!,
      );
    }
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(financeTransfers)
      .where(and(...conditions));
    return Number(count);
  }

  async findTransferById(id: string, schoolId: string): Promise<FinanceTransfer | undefined> {
    const [row] = await this.db
      .select()
      .from(financeTransfers)
      .where(
        and(
          eq(financeTransfers.id, id),
          eq(financeTransfers.school_id, schoolId),
          eq(financeTransfers.deleted, false),
        ),
      );
    return row;
  }

  /** Inserts the transfer and moves the balance between both accounts atomically. */
  async createTransferAndMove(data: NewFinanceTransfer): Promise<FinanceTransfer> {
    return this.db.transaction(async (tx) => {
      const [transfer] = await tx.insert(financeTransfers).values(data).returning();
      await tx
        .update(financeAccounts)
        .set({
          current_balance: sql`${financeAccounts.current_balance} - ${data.amount}::numeric`,
          updated_at: new Date(),
        })
        .where(eq(financeAccounts.id, data.from_account_id));
      await tx
        .update(financeAccounts)
        .set({
          current_balance: sql`${financeAccounts.current_balance} + ${data.amount}::numeric`,
          updated_at: new Date(),
        })
        .where(eq(financeAccounts.id, data.to_account_id));
      return transfer;
    });
  }

  /** Soft-deletes the transfer and reverses the balance move atomically. */
  async softDeleteTransferAndReverse(
    id: string,
    schoolId: string,
  ): Promise<FinanceTransfer | undefined> {
    return this.db.transaction(async (tx) => {
      const [transfer] = await tx
        .update(financeTransfers)
        .set({ deleted: true, updated_at: new Date() })
        .where(and(eq(financeTransfers.id, id), eq(financeTransfers.school_id, schoolId)))
        .returning();
      if (!transfer) return transfer;
      await tx
        .update(financeAccounts)
        .set({
          current_balance: sql`${financeAccounts.current_balance} + ${transfer.amount}::numeric`,
          updated_at: new Date(),
        })
        .where(eq(financeAccounts.id, transfer.from_account_id));
      await tx
        .update(financeAccounts)
        .set({
          current_balance: sql`${financeAccounts.current_balance} - ${transfer.amount}::numeric`,
          updated_at: new Date(),
        })
        .where(eq(financeAccounts.id, transfer.to_account_id));
      return transfer;
    });
  }

  // ─── REPORTS ────────────────────────────────────────────────────────────────

  async getBalanceAtDate(schoolId: string, accountId: string, beforeDate: string): Promise<number> {
    const account = await this.findAccountById(accountId, schoolId);
    if (!account) return 0;

    const [[incomeRow], [expenseRow], [transferInRow], [transferOutRow]] = await Promise.all([
      this.db
        .select({ total: sql<string>`COALESCE(SUM(${financeIncome.amount}), 0)` })
        .from(financeIncome)
        .where(
          and(
            eq(financeIncome.school_id, schoolId),
            eq(financeIncome.to_account_id, accountId),
            eq(financeIncome.deleted, false),
            lt(financeIncome.date_of_income, beforeDate),
          ),
        ),
      this.db
        .select({ total: sql<string>`COALESCE(SUM(${financeExpenses.total_amount}), 0)` })
        .from(financeExpenses)
        .where(
          and(
            eq(financeExpenses.school_id, schoolId),
            eq(financeExpenses.from_account_id, accountId),
            eq(financeExpenses.deleted, false),
            lt(financeExpenses.date_of_expense, beforeDate),
          ),
        ),
      this.db
        .select({ total: sql<string>`COALESCE(SUM(${financeTransfers.amount}), 0)` })
        .from(financeTransfers)
        .where(
          and(
            eq(financeTransfers.school_id, schoolId),
            eq(financeTransfers.to_account_id, accountId),
            eq(financeTransfers.deleted, false),
            lt(financeTransfers.date_of_transaction, beforeDate),
          ),
        ),
      this.db
        .select({ total: sql<string>`COALESCE(SUM(${financeTransfers.amount}), 0)` })
        .from(financeTransfers)
        .where(
          and(
            eq(financeTransfers.school_id, schoolId),
            eq(financeTransfers.from_account_id, accountId),
            eq(financeTransfers.deleted, false),
            lt(financeTransfers.date_of_transaction, beforeDate),
          ),
        ),
    ]);

    return (
      parseFloat(account.opening_balance) +
      parseFloat(incomeRow.total) +
      parseFloat(transferInRow.total) -
      parseFloat(expenseRow.total) -
      parseFloat(transferOutRow.total)
    );
  }

  async getAccountStatement(
    schoolId: string,
    accountId: string,
    startDate: string,
    endDate: string,
  ): Promise<StatementEntry[]> {
    const incomeRows = await this.db
      .select({
        txn_date: financeIncome.date_of_income,
        created_at: financeIncome.created_at,
        description: financeHeads.name,
        amount: financeIncome.amount,
        type: sql<string>`'income'`,
      })
      .from(financeIncome)
      .leftJoin(financeHeads, eq(financeIncome.income_head_id, financeHeads.id))
      .where(
        and(
          eq(financeIncome.school_id, schoolId),
          eq(financeIncome.to_account_id, accountId),
          eq(financeIncome.deleted, false),
          gte(financeIncome.date_of_income, startDate),
          lte(financeIncome.date_of_income, endDate),
        ),
      );

    const expenseRows = await this.db
      .select({
        txn_date: financeExpenses.date_of_expense,
        created_at: financeExpenses.created_at,
        description: financeHeads.name,
        amount: financeExpenses.total_amount,
        type: sql<string>`'expense'`,
      })
      .from(financeExpenses)
      .leftJoin(financeHeads, eq(financeExpenses.expense_head_id, financeHeads.id))
      .where(
        and(
          eq(financeExpenses.school_id, schoolId),
          eq(financeExpenses.from_account_id, accountId),
          eq(financeExpenses.deleted, false),
          gte(financeExpenses.date_of_expense, startDate),
          lte(financeExpenses.date_of_expense, endDate),
        ),
      );

    const transferInRows = await this.db
      .select({
        txn_date: financeTransfers.date_of_transaction,
        created_at: financeTransfers.created_at,
        amount: financeTransfers.amount,
        type: sql<string>`'transfer_in'`,
      })
      .from(financeTransfers)
      .where(
        and(
          eq(financeTransfers.school_id, schoolId),
          eq(financeTransfers.to_account_id, accountId),
          eq(financeTransfers.deleted, false),
          gte(financeTransfers.date_of_transaction, startDate),
          lte(financeTransfers.date_of_transaction, endDate),
        ),
      );

    const transferOutRows = await this.db
      .select({
        txn_date: financeTransfers.date_of_transaction,
        created_at: financeTransfers.created_at,
        amount: financeTransfers.amount,
        type: sql<string>`'transfer_out'`,
      })
      .from(financeTransfers)
      .where(
        and(
          eq(financeTransfers.school_id, schoolId),
          eq(financeTransfers.from_account_id, accountId),
          eq(financeTransfers.deleted, false),
          gte(financeTransfers.date_of_transaction, startDate),
          lte(financeTransfers.date_of_transaction, endDate),
        ),
      );

    type RawEntry = {
      txn_date: string;
      created_at: Date;
      description?: string | null;
      amount: string;
      type: string;
    };
    const all: RawEntry[] = [
      ...incomeRows.map((r) => ({
        ...r,
        description: r.description ?? 'Income',
        txn_date: r.txn_date ?? '',
      })),
      ...expenseRows.map((r) => ({
        ...r,
        description: r.description ?? 'Expense',
        txn_date: r.txn_date ?? '',
      })),
      ...transferInRows.map((r) => ({
        ...r,
        description: 'Transfer In',
        txn_date: r.txn_date ?? '',
      })),
      ...transferOutRows.map((r) => ({
        ...r,
        description: 'Transfer Out',
        txn_date: r.txn_date ?? '',
      })),
    ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return all.map((r) => ({
      txn_date: r.txn_date,
      value_date: r.txn_date,
      description: r.description ?? '',
      debit: r.type === 'expense' || r.type === 'transfer_out' ? r.amount : null,
      credit: r.type === 'income' || r.type === 'transfer_in' ? r.amount : null,
      balance: '0',
      type: r.type as StatementEntry['type'],
    }));
  }

  async getRegisterEntries(
    schoolId: string,
    filters: { start_date?: string; end_date?: string; account_id?: string; head_type?: string },
  ): Promise<RegisterEntry[]> {
    const incomeConditions = [
      eq(financeIncome.school_id, schoolId),
      eq(financeIncome.deleted, false),
    ];
    const expenseConditions = [
      eq(financeExpenses.school_id, schoolId),
      eq(financeExpenses.deleted, false),
    ];
    if (filters.start_date) {
      incomeConditions.push(gte(financeIncome.date_of_income, filters.start_date));
      expenseConditions.push(gte(financeExpenses.date_of_expense, filters.start_date));
    }
    if (filters.end_date) {
      incomeConditions.push(lte(financeIncome.date_of_income, filters.end_date));
      expenseConditions.push(lte(financeExpenses.date_of_expense, filters.end_date));
    }
    if (filters.account_id) {
      incomeConditions.push(eq(financeIncome.to_account_id, filters.account_id));
      expenseConditions.push(eq(financeExpenses.from_account_id, filters.account_id));
    }

    const incomeEntries: RegisterEntry[] = [];
    const expenseEntries: RegisterEntry[] = [];

    if (!filters.head_type || filters.head_type === 'Income') {
      const rows = await this.db
        .select({
          id: financeIncome.id,
          created_at: financeIncome.created_at,
          transaction_date: financeIncome.date_of_income,
          head_name: financeHeads.name,
          account_name: financeAccounts.name,
          amount: financeIncome.amount,
          student_id: financeIncome.student_id,
          remarks: financeIncome.remarks,
        })
        .from(financeIncome)
        .leftJoin(financeHeads, eq(financeIncome.income_head_id, financeHeads.id))
        .leftJoin(financeAccounts, eq(financeIncome.to_account_id, financeAccounts.id))
        .where(and(...incomeConditions))
        .orderBy(desc(financeIncome.created_at));
      rows.forEach((r) =>
        incomeEntries.push({
          id: r.id,
          created_at: r.created_at?.toISOString() ?? '',
          transaction_date: r.transaction_date ?? '',
          head_name: r.head_name ?? '',
          head_type: 'Income',
          account_name: r.account_name ?? '',
          amount: r.amount,
          payee_id: r.student_id,
          remarks: r.remarks,
          type: 'income',
        }),
      );
    }

    if (!filters.head_type || filters.head_type === 'Expense') {
      const rows = await this.db
        .select({
          id: financeExpenses.id,
          created_at: financeExpenses.created_at,
          transaction_date: financeExpenses.date_of_expense,
          head_name: financeHeads.name,
          account_name: financeAccounts.name,
          amount: financeExpenses.total_amount,
          employee_id: financeExpenses.employee_id,
          remarks: financeExpenses.remarks,
        })
        .from(financeExpenses)
        .leftJoin(financeHeads, eq(financeExpenses.expense_head_id, financeHeads.id))
        .leftJoin(financeAccounts, eq(financeExpenses.from_account_id, financeAccounts.id))
        .where(and(...expenseConditions))
        .orderBy(desc(financeExpenses.created_at));
      rows.forEach((r) =>
        expenseEntries.push({
          id: r.id,
          created_at: r.created_at?.toISOString() ?? '',
          transaction_date: r.transaction_date ?? '',
          head_name: r.head_name ?? '',
          head_type: 'Expense',
          account_name: r.account_name ?? '',
          amount: r.amount,
          payee_id: r.employee_id,
          remarks: r.remarks,
          type: 'expense',
        }),
      );
    }

    return [...incomeEntries, ...expenseEntries].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }

  async getProfitLossData(schoolId: string, startDate: string, endDate: string) {
    const incomeByHead = await this.db
      .select({
        head_name: financeHeads.name,
        total: sql<string>`COALESCE(SUM(${financeIncome.amount}), 0)`,
      })
      .from(financeIncome)
      .leftJoin(financeHeads, eq(financeIncome.income_head_id, financeHeads.id))
      .where(
        and(
          eq(financeIncome.school_id, schoolId),
          eq(financeIncome.deleted, false),
          gte(financeIncome.date_of_income, startDate),
          lte(financeIncome.date_of_income, endDate),
        ),
      )
      .groupBy(financeHeads.name);

    const expenseByHead = await this.db
      .select({
        head_name: financeHeads.name,
        total: sql<string>`COALESCE(SUM(${financeExpenses.total_amount}), 0)`,
      })
      .from(financeExpenses)
      .leftJoin(financeHeads, eq(financeExpenses.expense_head_id, financeHeads.id))
      .where(
        and(
          eq(financeExpenses.school_id, schoolId),
          eq(financeExpenses.deleted, false),
          gte(financeExpenses.date_of_expense, startDate),
          lte(financeExpenses.date_of_expense, endDate),
        ),
      )
      .groupBy(financeHeads.name);

    return { incomeByHead, expenseByHead };
  }
}
