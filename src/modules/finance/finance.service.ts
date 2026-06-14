import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { FinanceRepository } from './finance.repository';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { PaginationResponse } from '../../shared/responses/api-response';
import { CacheTTL } from '../../shared/constants';
import { CreateFinanceAccountDto } from './dto/create-finance-account.dto';
import { UpdateFinanceAccountDto } from './dto/update-finance-account.dto';
import { FilterFinanceAccountDto } from './dto/filter-finance-account.dto';
import { CreateFinanceHeadDto } from './dto/create-finance-head.dto';
import { UpdateFinanceHeadDto } from './dto/update-finance-head.dto';
import { FilterFinanceHeadDto } from './dto/filter-finance-head.dto';
import { CreateFinanceExpenseDto } from './dto/create-finance-expense.dto';
import { CreateFinanceIncomeDto } from './dto/create-finance-income.dto';
import { CreateFinanceTransferDto } from './dto/create-finance-transfer.dto';
import { FilterTransactionsDto } from './dto/filter-transactions.dto';
import { AccountStatementDto } from './dto/account-statement.dto';
import { FinanceRegisterDto } from './dto/finance-register.dto';
import { ProfitLossDto } from './dto/profit-loss.dto';
import {
  FinanceAccount,
  FinanceHead,
  FinanceExpenseWithRelations,
  FinanceIncomeWithRelations,
  FinanceTransferWithRelations,
  AccountStatement,
  ProfitLossSummary,
} from './types/finance.types';

@Injectable()
export class FinanceService {
  constructor(
    private readonly financeRepo: FinanceRepository,
    private readonly redisService: RedisService,
  ) {}

  private accountKey(schoolId: string) {
    return `finance:accounts:${schoolId}`;
  }
  private headKey(schoolId: string) {
    return `finance:heads:${schoolId}`;
  }
  private expenseKey(schoolId: string) {
    return `finance:expenses:${schoolId}`;
  }
  private incomeKey(schoolId: string) {
    return `finance:income:${schoolId}`;
  }
  private transferKey(schoolId: string) {
    return `finance:transfers:${schoolId}`;
  }

  // ─── ACCOUNTS ───────────────────────────────────────────────────────────────

  async findAllAccounts(
    schoolId: string,
    filters: FilterFinanceAccountDto,
  ): Promise<PaginationResponse<FinanceAccount>> {
    const key = `${this.accountKey(schoolId)}:list:${JSON.stringify(filters)}`;
    return this.redisService.getOrSet(key, CacheTTL.MEDIUM, async () => {
      const [items, total] = await Promise.all([
        this.financeRepo.findAllAccounts(schoolId, filters),
        this.financeRepo.countAccounts(schoolId, filters),
      ]);
      return PaginationResponse.of(items, total, filters);
    });
  }

  async findAccountById(id: string, schoolId: string): Promise<FinanceAccount> {
    const key = `${this.accountKey(schoolId)}:${id}`;
    return this.redisService.getOrSet(key, CacheTTL.MEDIUM, async () => {
      const account = await this.financeRepo.findAccountById(id, schoolId);
      if (!account) throw new NotFoundException(`Finance account '${id}' not found`);
      return account;
    });
  }

  async createAccount(
    dto: CreateFinanceAccountDto,
    schoolId: string,
    createdBy: string,
  ): Promise<FinanceAccount> {
    const openingBalance = String(dto.opening_balance ?? 0);
    const account = await this.financeRepo.createAccount({
      id: generateId(),
      school_id: schoolId,
      created_by: createdBy,
      name: dto.name,
      account_type: dto.account_type,
      opening_balance: openingBalance,
      current_balance: openingBalance,
      account_start_date: dto.account_start_date,
      is_enabled: dto.is_enabled ?? true,
    });
    await this.redisService.delByPattern(`${this.accountKey(schoolId)}:*`);
    return account;
  }

  async updateAccount(
    id: string,
    schoolId: string,
    dto: UpdateFinanceAccountDto,
  ): Promise<FinanceAccount> {
    await this.findAccountById(id, schoolId);
    const updated = await this.financeRepo.updateAccount(id, schoolId, dto);
    if (!updated) throw new NotFoundException(`Finance account '${id}' not found`);
    await this.redisService.delByPattern(`${this.accountKey(schoolId)}:*`);
    return updated;
  }

  async removeAccount(id: string, schoolId: string): Promise<void> {
    await this.findAccountById(id, schoolId);
    await this.financeRepo.softDeleteAccount(id, schoolId);
    await this.redisService.delByPattern(`${this.accountKey(schoolId)}:*`);
  }

  // ─── HEADS ──────────────────────────────────────────────────────────────────

  async findAllHeads(
    schoolId: string,
    filters: FilterFinanceHeadDto,
  ): Promise<PaginationResponse<FinanceHead>> {
    const key = `${this.headKey(schoolId)}:list:${JSON.stringify(filters)}`;
    return this.redisService.getOrSet(key, CacheTTL.MEDIUM, async () => {
      const [items, total] = await Promise.all([
        this.financeRepo.findAllHeads(schoolId, filters),
        this.financeRepo.countHeads(schoolId, filters),
      ]);
      return PaginationResponse.of(items, total, filters);
    });
  }

  async findHeadById(id: string, schoolId: string): Promise<FinanceHead> {
    const key = `${this.headKey(schoolId)}:${id}`;
    return this.redisService.getOrSet(key, CacheTTL.MEDIUM, async () => {
      const head = await this.financeRepo.findHeadById(id, schoolId);
      if (!head) throw new NotFoundException(`Finance head '${id}' not found`);
      return head;
    });
  }

  async createHead(
    dto: CreateFinanceHeadDto,
    schoolId: string,
    createdBy: string,
  ): Promise<FinanceHead> {
    const head = await this.financeRepo.createHead({
      id: generateId(),
      school_id: schoolId,
      created_by: createdBy,
      name: dto.name,
      head_type: dto.head_type,
      is_enabled: dto.is_enabled ?? true,
    });
    await this.redisService.delByPattern(`${this.headKey(schoolId)}:*`);
    return head;
  }

  async updateHead(id: string, schoolId: string, dto: UpdateFinanceHeadDto): Promise<FinanceHead> {
    await this.findHeadById(id, schoolId);
    const updated = await this.financeRepo.updateHead(id, schoolId, dto);
    if (!updated) throw new NotFoundException(`Finance head '${id}' not found`);
    await this.redisService.delByPattern(`${this.headKey(schoolId)}:*`);
    return updated;
  }

  async removeHead(id: string, schoolId: string): Promise<void> {
    await this.findHeadById(id, schoolId);
    await this.financeRepo.softDeleteHead(id, schoolId);
    await this.redisService.delByPattern(`${this.headKey(schoolId)}:*`);
  }

  // ─── EXPENSES ───────────────────────────────────────────────────────────────

  async findAllExpenses(
    schoolId: string,
    filters: FilterTransactionsDto,
  ): Promise<PaginationResponse<FinanceExpenseWithRelations>> {
    const key = `${this.expenseKey(schoolId)}:list:${JSON.stringify(filters)}`;
    return this.redisService.getOrSet(key, CacheTTL.SHORT, async () => {
      const [items, total] = await Promise.all([
        this.financeRepo.findAllExpenses(schoolId, filters),
        this.financeRepo.countExpenses(schoolId, filters),
      ]);
      return PaginationResponse.of(items, total, filters);
    });
  }

  async createExpense(dto: CreateFinanceExpenseDto, schoolId: string, createdBy: string) {
    const account = await this.findAccountById(dto.from_account_id, schoolId);
    if (!account.is_enabled) throw new BadRequestException('Account is disabled');

    const amountStr = String(dto.total_amount);
    const expense = await this.financeRepo.createExpense({
      id: generateId(),
      school_id: schoolId,
      created_by: createdBy,
      expense_head_id: dto.expense_head_id,
      from_account_id: dto.from_account_id,
      employee_id: dto.employee_id,
      total_amount: amountStr,
      date_of_expense: dto.date_of_expense,
      remarks: dto.remarks,
    });
    await this.financeRepo.debitAccount(dto.from_account_id, amountStr);
    await this.redisService.delByPattern(`${this.expenseKey(schoolId)}:*`);
    await this.redisService.delByPattern(`${this.accountKey(schoolId)}:*`);
    return expense;
  }

  async removeExpense(id: string, schoolId: string): Promise<void> {
    const expense = await this.financeRepo.findExpenseById(id, schoolId);
    if (!expense) throw new NotFoundException(`Expense '${id}' not found`);
    await this.financeRepo.softDeleteExpense(id, schoolId);
    await this.financeRepo.creditAccount(expense.from_account_id, expense.total_amount);
    await this.redisService.delByPattern(`${this.expenseKey(schoolId)}:*`);
    await this.redisService.delByPattern(`${this.accountKey(schoolId)}:*`);
  }

  // ─── INCOME ─────────────────────────────────────────────────────────────────

  async findAllIncome(
    schoolId: string,
    filters: FilterTransactionsDto,
  ): Promise<PaginationResponse<FinanceIncomeWithRelations>> {
    const key = `${this.incomeKey(schoolId)}:list:${JSON.stringify(filters)}`;
    return this.redisService.getOrSet(key, CacheTTL.SHORT, async () => {
      const [items, total] = await Promise.all([
        this.financeRepo.findAllIncome(schoolId, filters),
        this.financeRepo.countIncome(schoolId, filters),
      ]);
      return PaginationResponse.of(items, total, filters);
    });
  }

  async createIncome(dto: CreateFinanceIncomeDto, schoolId: string, createdBy: string) {
    const account = await this.findAccountById(dto.to_account_id, schoolId);
    if (!account.is_enabled) throw new BadRequestException('Account is disabled');

    const amountStr = String(dto.amount);
    const income = await this.financeRepo.createIncome({
      id: generateId(),
      school_id: schoolId,
      created_by: createdBy,
      income_head_id: dto.income_head_id,
      to_account_id: dto.to_account_id,
      student_id: dto.student_id,
      amount: amountStr,
      date_of_income: dto.date_of_income,
      remarks: dto.remarks,
    });
    await this.financeRepo.creditAccount(dto.to_account_id, amountStr);
    await this.redisService.delByPattern(`${this.incomeKey(schoolId)}:*`);
    await this.redisService.delByPattern(`${this.accountKey(schoolId)}:*`);
    return income;
  }

  async removeIncome(id: string, schoolId: string): Promise<void> {
    const income = await this.financeRepo.findIncomeById(id, schoolId);
    if (!income) throw new NotFoundException(`Income record '${id}' not found`);
    await this.financeRepo.softDeleteIncome(id, schoolId);
    await this.financeRepo.debitAccount(income.to_account_id, income.amount);
    await this.redisService.delByPattern(`${this.incomeKey(schoolId)}:*`);
    await this.redisService.delByPattern(`${this.accountKey(schoolId)}:*`);
  }

  // ─── TRANSFERS ──────────────────────────────────────────────────────────────

  async findAllTransfers(
    schoolId: string,
    filters: FilterTransactionsDto,
  ): Promise<PaginationResponse<FinanceTransferWithRelations>> {
    const key = `${this.transferKey(schoolId)}:list:${JSON.stringify(filters)}`;
    return this.redisService.getOrSet(key, CacheTTL.SHORT, async () => {
      const [items, total] = await Promise.all([
        this.financeRepo.findAllTransfers(schoolId, filters),
        this.financeRepo.countTransfers(schoolId, filters),
      ]);
      return PaginationResponse.of(items, total, filters);
    });
  }

  async createTransfer(dto: CreateFinanceTransferDto, schoolId: string, createdBy: string) {
    if (dto.from_account_id === dto.to_account_id) {
      throw new BadRequestException('Source and destination accounts must differ');
    }
    const [fromAccount, toAccount] = await Promise.all([
      this.findAccountById(dto.from_account_id, schoolId),
      this.findAccountById(dto.to_account_id, schoolId),
    ]);
    if (!fromAccount.is_enabled) throw new BadRequestException('Source account is disabled');
    if (!toAccount.is_enabled) throw new BadRequestException('Destination account is disabled');

    const amountStr = String(dto.amount);
    const transfer = await this.financeRepo.createTransfer({
      id: generateId(),
      school_id: schoolId,
      created_by: createdBy,
      from_account_id: dto.from_account_id,
      to_account_id: dto.to_account_id,
      amount: amountStr,
      date_of_transaction: dto.date_of_transaction,
      remarks: dto.remarks,
    });
    await Promise.all([
      this.financeRepo.debitAccount(dto.from_account_id, amountStr),
      this.financeRepo.creditAccount(dto.to_account_id, amountStr),
    ]);
    await this.redisService.delByPattern(`${this.transferKey(schoolId)}:*`);
    await this.redisService.delByPattern(`${this.accountKey(schoolId)}:*`);
    return transfer;
  }

  async removeTransfer(id: string, schoolId: string): Promise<void> {
    const transfer = await this.financeRepo.findTransferById(id, schoolId);
    if (!transfer) throw new NotFoundException(`Transfer '${id}' not found`);
    await this.financeRepo.softDeleteTransfer(id, schoolId);
    await Promise.all([
      this.financeRepo.creditAccount(transfer.from_account_id, transfer.amount),
      this.financeRepo.debitAccount(transfer.to_account_id, transfer.amount),
    ]);
    await this.redisService.delByPattern(`${this.transferKey(schoolId)}:*`);
    await this.redisService.delByPattern(`${this.accountKey(schoolId)}:*`);
  }

  // ─── REPORTS ────────────────────────────────────────────────────────────────

  async getAccountStatement(dto: AccountStatementDto, schoolId: string): Promise<AccountStatement> {
    const account = await this.findAccountById(dto.account_id, schoolId);

    const [periodOpeningBalance, entries] = await Promise.all([
      this.financeRepo.getBalanceAtDate(schoolId, dto.account_id, dto.start_date),
      this.financeRepo.getAccountStatement(schoolId, dto.account_id, dto.start_date, dto.end_date),
    ]);

    let runningBalance = periodOpeningBalance;
    const entriesWithBalance = entries.map((entry) => {
      if (entry.credit) runningBalance += parseFloat(entry.credit);
      if (entry.debit) runningBalance -= parseFloat(entry.debit);
      return { ...entry, balance: runningBalance.toFixed(2) };
    });

    const closingBalance =
      entriesWithBalance.length > 0
        ? entriesWithBalance[entriesWithBalance.length - 1].balance
        : periodOpeningBalance.toFixed(2);

    return {
      account,
      opening_balance: periodOpeningBalance.toFixed(2),
      closing_balance: closingBalance,
      current_balance: account.current_balance,
      entries: entriesWithBalance,
    };
  }

  async getRegister(dto: FinanceRegisterDto, schoolId: string) {
    return this.financeRepo.getRegisterEntries(schoolId, {
      start_date: dto.start_date,
      end_date: dto.end_date,
      account_id: dto.account_id,
      head_type: dto.head_type,
    });
  }

  async getProfitLoss(dto: ProfitLossDto, schoolId: string): Promise<ProfitLossSummary> {
    const { incomeByHead, expenseByHead } = await this.financeRepo.getProfitLossData(
      schoolId,
      dto.start_date,
      dto.end_date,
    );

    const totalIncome = incomeByHead.reduce((sum, r) => sum + parseFloat(r.total), 0);
    const totalExpense = expenseByHead.reduce((sum, r) => sum + parseFloat(r.total), 0);

    return {
      total_income: totalIncome.toFixed(2),
      total_expense: totalExpense.toFixed(2),
      net_profit: (totalIncome - totalExpense).toFixed(2),
      income_heads: incomeByHead.map((r) => ({
        head_name: r.head_name ?? 'Unknown',
        amount: r.total,
      })),
      expense_heads: expenseByHead.map((r) => ({
        head_name: r.head_name ?? 'Unknown',
        amount: r.total,
      })),
    };
  }
}
