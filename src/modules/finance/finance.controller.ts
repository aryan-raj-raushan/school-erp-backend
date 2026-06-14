import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { PERMISSION_REGISTRY } from '../../shared/constants/permissions.registry';
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

@ApiTags('Finance')
@ApiBearerAuth('access-token')
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  // ─── ACCOUNTS ───────────────────────────────────────────────────────────────

  @Post('accounts')
  @Permissions(PERMISSION_REGISTRY.finance.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a finance account' })
  async createAccount(
    @Body() dto: CreateFinanceAccountDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.financeService.createAccount(dto, schoolId, userId);
    return ApiResponse.created(data, 'Finance account created successfully');
  }

  @Get('accounts')
  @Permissions(PERMISSION_REGISTRY.finance.view)
  @ApiOperation({ summary: 'List all finance accounts' })
  async findAllAccounts(
    @GetSchoolId() schoolId: string,
    @Query() filters: FilterFinanceAccountDto,
  ) {
    const data = await this.financeService.findAllAccounts(schoolId, filters);
    return ApiResponse.success(data.items, 'Finance accounts fetched successfully', data.meta);
  }

  @Get('accounts/:id')
  @Permissions(PERMISSION_REGISTRY.finance.view)
  @ApiOperation({ summary: 'Get finance account by ID' })
  async findAccount(@Param('id') id: string, @GetSchoolId() schoolId: string) {
    const data = await this.financeService.findAccountById(id, schoolId);
    return ApiResponse.success(data, 'Finance account fetched successfully');
  }

  @Patch('accounts/:id')
  @Permissions(PERMISSION_REGISTRY.finance.update)
  @ApiOperation({ summary: 'Update finance account (opening balance is immutable)' })
  async updateAccount(
    @Param('id') id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateFinanceAccountDto,
  ) {
    const data = await this.financeService.updateAccount(id, schoolId, dto);
    return ApiResponse.success(data, 'Finance account updated successfully');
  }

  @Delete('accounts/:id')
  @Permissions(PERMISSION_REGISTRY.finance.delete)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a finance account' })
  async removeAccount(@Param('id') id: string, @GetSchoolId() schoolId: string) {
    await this.financeService.removeAccount(id, schoolId);
    return ApiResponse.noContent('Finance account deleted successfully');
  }

  // ─── HEADS ──────────────────────────────────────────────────────────────────

  @Post('heads')
  @Permissions(PERMISSION_REGISTRY.finance.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create income/expense head' })
  async createHead(
    @Body() dto: CreateFinanceHeadDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.financeService.createHead(dto, schoolId, userId);
    return ApiResponse.created(data, 'Finance head created successfully');
  }

  @Get('heads')
  @Permissions(PERMISSION_REGISTRY.finance.view)
  @ApiOperation({ summary: 'List all income/expense heads' })
  async findAllHeads(@GetSchoolId() schoolId: string, @Query() filters: FilterFinanceHeadDto) {
    const data = await this.financeService.findAllHeads(schoolId, filters);
    return ApiResponse.success(data.items, 'Finance heads fetched successfully', data.meta);
  }

  @Get('heads/:id')
  @Permissions(PERMISSION_REGISTRY.finance.view)
  @ApiOperation({ summary: 'Get finance head by ID' })
  async findHead(@Param('id') id: string, @GetSchoolId() schoolId: string) {
    const data = await this.financeService.findHeadById(id, schoolId);
    return ApiResponse.success(data, 'Finance head fetched successfully');
  }

  @Patch('heads/:id')
  @Permissions(PERMISSION_REGISTRY.finance.update)
  @ApiOperation({ summary: 'Update finance head' })
  async updateHead(
    @Param('id') id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateFinanceHeadDto,
  ) {
    const data = await this.financeService.updateHead(id, schoolId, dto);
    return ApiResponse.success(data, 'Finance head updated successfully');
  }

  @Delete('heads/:id')
  @Permissions(PERMISSION_REGISTRY.finance.delete)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a finance head' })
  async removeHead(@Param('id') id: string, @GetSchoolId() schoolId: string) {
    await this.financeService.removeHead(id, schoolId);
    return ApiResponse.noContent('Finance head deleted successfully');
  }

  // ─── EXPENSES ───────────────────────────────────────────────────────────────

  @Post('expenses')
  @Permissions(PERMISSION_REGISTRY.finance.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record a finance expense' })
  async createExpense(
    @Body() dto: CreateFinanceExpenseDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.financeService.createExpense(dto, schoolId, userId);
    return ApiResponse.created(data, 'Expense recorded successfully');
  }

  @Get('expenses')
  @Permissions(PERMISSION_REGISTRY.finance.view)
  @ApiOperation({ summary: 'List finance expenses (latest 25 by default)' })
  async findAllExpenses(@GetSchoolId() schoolId: string, @Query() filters: FilterTransactionsDto) {
    const data = await this.financeService.findAllExpenses(schoolId, filters);
    return ApiResponse.success(data.items, 'Expenses fetched successfully', data.meta);
  }

  @Delete('expenses/:id')
  @Permissions(PERMISSION_REGISTRY.finance.delete)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete expense and reverse account balance' })
  async removeExpense(@Param('id') id: string, @GetSchoolId() schoolId: string) {
    await this.financeService.removeExpense(id, schoolId);
    return ApiResponse.noContent('Expense deleted and balance reversed');
  }

  // ─── INCOME ─────────────────────────────────────────────────────────────────

  @Post('income')
  @Permissions(PERMISSION_REGISTRY.finance.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record finance income' })
  async createIncome(
    @Body() dto: CreateFinanceIncomeDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.financeService.createIncome(dto, schoolId, userId);
    return ApiResponse.created(data, 'Income recorded successfully');
  }

  @Get('income')
  @Permissions(PERMISSION_REGISTRY.finance.view)
  @ApiOperation({ summary: 'List finance income records (latest 25 by default)' })
  async findAllIncome(@GetSchoolId() schoolId: string, @Query() filters: FilterTransactionsDto) {
    const data = await this.financeService.findAllIncome(schoolId, filters);
    return ApiResponse.success(data.items, 'Income fetched successfully', data.meta);
  }

  @Delete('income/:id')
  @Permissions(PERMISSION_REGISTRY.finance.delete)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete income and reverse account balance' })
  async removeIncome(@Param('id') id: string, @GetSchoolId() schoolId: string) {
    await this.financeService.removeIncome(id, schoolId);
    return ApiResponse.noContent('Income deleted and balance reversed');
  }

  // ─── TRANSFERS ──────────────────────────────────────────────────────────────

  @Post('transfers')
  @Permissions(PERMISSION_REGISTRY.finance.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Transfer balance between accounts' })
  async createTransfer(
    @Body() dto: CreateFinanceTransferDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.financeService.createTransfer(dto, schoolId, userId);
    return ApiResponse.created(data, 'Transfer recorded successfully');
  }

  @Get('transfers')
  @Permissions(PERMISSION_REGISTRY.finance.view)
  @ApiOperation({ summary: 'List account balance transfers' })
  async findAllTransfers(@GetSchoolId() schoolId: string, @Query() filters: FilterTransactionsDto) {
    const data = await this.financeService.findAllTransfers(schoolId, filters);
    return ApiResponse.success(data.items, 'Transfers fetched successfully', data.meta);
  }

  @Delete('transfers/:id')
  @Permissions(PERMISSION_REGISTRY.finance.delete)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete transfer and reverse both account balances' })
  async removeTransfer(@Param('id') id: string, @GetSchoolId() schoolId: string) {
    await this.financeService.removeTransfer(id, schoolId);
    return ApiResponse.noContent('Transfer deleted and balances reversed');
  }

  // ─── REPORTS ────────────────────────────────────────────────────────────────

  @Get('reports/statement')
  @Permissions(PERMISSION_REGISTRY.finance.view)
  @ApiOperation({ summary: 'Get account statement for a date range' })
  async getStatement(@GetSchoolId() schoolId: string, @Query() dto: AccountStatementDto) {
    const data = await this.financeService.getAccountStatement(dto, schoolId);
    return ApiResponse.success(data, 'Account statement fetched successfully');
  }

  @Get('reports/register')
  @Permissions(PERMISSION_REGISTRY.finance.view)
  @ApiOperation({ summary: 'Finance daily register (income + expense combined)' })
  async getRegister(@GetSchoolId() schoolId: string, @Query() dto: FinanceRegisterDto) {
    const data = await this.financeService.getRegister(dto, schoolId);
    return ApiResponse.success(data, 'Finance register fetched successfully');
  }

  @Get('reports/profit-loss')
  @Permissions(PERMISSION_REGISTRY.finance.view)
  @ApiOperation({ summary: 'Profit & Loss summary for a date range' })
  async getProfitLoss(@GetSchoolId() schoolId: string, @Query() dto: ProfitLossDto) {
    const data = await this.financeService.getProfitLoss(dto, schoolId);
    return ApiResponse.success(data, 'Profit & Loss fetched successfully');
  }
}
