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
import { SalaryService } from './salary.service';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { GetCurrentUserId } from '../../common/decorators/current-user.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { ApiResponse } from '../../shared/responses/api-response';
import { PERMISSION_REGISTRY } from '../../shared/constants/permissions.registry';
import { CreateSalaryHeadDto } from './dto/create-salary-head.dto';
import { UpdateSalaryHeadDto } from './dto/update-salary-head.dto';
import { CreateSalaryTemplateDto } from './dto/create-salary-template.dto';
import { UpdateSalaryTemplateDto } from './dto/update-salary-template.dto';
import { AssignSalaryStructureDto } from './dto/assign-salary-structure.dto';
import { CreateSalaryTransactionDto } from './dto/create-salary-transaction.dto';
import { FilterSalaryHeadDto, FilterSalaryTransactionDto } from './dto/filter-salary.dto';

@ApiTags('Salary')
@ApiBearerAuth('access-token')
@Controller('salary')
export class SalaryController {
  constructor(private readonly salaryService: SalaryService) {}

  // ─── HEADS ──────────────────────────────────────────────────────────────────

  @Post('heads')
  @Permissions(PERMISSION_REGISTRY.salary.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a salary head (Earning/Deduction)' })
  async createHead(
    @Body() dto: CreateSalaryHeadDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.salaryService.createHead(dto, schoolId, userId);
    return ApiResponse.created(data, 'Salary head created');
  }

  @Get('heads')
  @Permissions(PERMISSION_REGISTRY.salary.view)
  @ApiOperation({ summary: 'List salary heads' })
  async findAllHeads(@GetSchoolId() schoolId: string, @Query() filters: FilterSalaryHeadDto) {
    const data = await this.salaryService.findAllHeads(schoolId, filters);
    return ApiResponse.success(data.items, 'Salary heads fetched', data.meta);
  }

  @Patch('heads/:id')
  @Permissions(PERMISSION_REGISTRY.salary.update)
  @ApiOperation({ summary: 'Update salary head' })
  async updateHead(
    @Param('id') id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateSalaryHeadDto,
  ) {
    const data = await this.salaryService.updateHead(id, schoolId, dto);
    return ApiResponse.success(data, 'Salary head updated');
  }

  @Delete('heads/:id')
  @Permissions(PERMISSION_REGISTRY.salary.delete)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete salary head' })
  async removeHead(@Param('id') id: string, @GetSchoolId() schoolId: string) {
    await this.salaryService.removeHead(id, schoolId);
    return ApiResponse.noContent('Salary head deleted');
  }

  // ─── TEMPLATES ──────────────────────────────────────────────────────────────

  @Post('templates')
  @Permissions(PERMISSION_REGISTRY.salary.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create salary structure template' })
  async createTemplate(
    @Body() dto: CreateSalaryTemplateDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.salaryService.createTemplate(dto, schoolId, userId);
    return ApiResponse.created(data, 'Salary template created');
  }

  @Get('templates')
  @Permissions(PERMISSION_REGISTRY.salary.view)
  @ApiOperation({ summary: 'List salary structure templates' })
  async findAllTemplates(@GetSchoolId() schoolId: string) {
    const data = await this.salaryService.findAllTemplates(schoolId);
    return ApiResponse.success(data, 'Salary templates fetched');
  }

  @Get('templates/:id')
  @Permissions(PERMISSION_REGISTRY.salary.view)
  @ApiOperation({ summary: 'Get salary template by ID' })
  async findTemplate(@Param('id') id: string, @GetSchoolId() schoolId: string) {
    const data = await this.salaryService.findTemplateById(id, schoolId);
    return ApiResponse.success(data, 'Salary template fetched');
  }

  @Patch('templates/:id')
  @Permissions(PERMISSION_REGISTRY.salary.update)
  @ApiOperation({ summary: 'Update salary template + items' })
  async updateTemplate(
    @Param('id') id: string,
    @GetSchoolId() schoolId: string,
    @Body() dto: UpdateSalaryTemplateDto,
  ) {
    const data = await this.salaryService.updateTemplate(id, schoolId, dto);
    return ApiResponse.success(data, 'Salary template updated');
  }

  @Delete('templates/:id')
  @Permissions(PERMISSION_REGISTRY.salary.delete)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete salary template' })
  async removeTemplate(@Param('id') id: string, @GetSchoolId() schoolId: string) {
    await this.salaryService.removeTemplate(id, schoolId);
    return ApiResponse.noContent('Salary template deleted');
  }

  // ─── ASSIGNMENTS ─────────────────────────────────────────────────────────────

  @Post('assignments')
  @Permissions(PERMISSION_REGISTRY.salary.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Assign salary structure to employee' })
  async assign(
    @Body() dto: AssignSalaryStructureDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.salaryService.assignStructure(dto, schoolId, userId);
    return ApiResponse.created(data, 'Salary structure assigned');
  }

  @Get('assignments')
  @Permissions(PERMISSION_REGISTRY.salary.view)
  @ApiOperation({ summary: 'List all salary assignments' })
  async findAllAssignments(@GetSchoolId() schoolId: string) {
    const data = await this.salaryService.findAllAssignments(schoolId);
    return ApiResponse.success(data, 'Assignments fetched');
  }

  @Get('assignments/employee/:employeeId')
  @Permissions(PERMISSION_REGISTRY.salary.view)
  @ApiOperation({ summary: 'Get salary assignments for an employee' })
  async findByEmployee(@Param('employeeId') employeeId: string, @GetSchoolId() schoolId: string) {
    const data = await this.salaryService.findAssignmentsByEmployee(schoolId, employeeId);
    return ApiResponse.success(data, 'Employee assignments fetched');
  }

  @Delete('assignments/:id')
  @Permissions(PERMISSION_REGISTRY.salary.delete)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate salary assignment' })
  async deactivateAssignment(@Param('id') id: string, @GetSchoolId() schoolId: string) {
    await this.salaryService.deactivateAssignment(id, schoolId);
    return ApiResponse.noContent('Assignment deactivated');
  }

  // ─── TRANSACTIONS ────────────────────────────────────────────────────────────

  @Post('transactions')
  @Permissions(PERMISSION_REGISTRY.salary.create)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create monthly salary transaction (PENDING status)' })
  async createTransaction(
    @Body() dto: CreateSalaryTransactionDto,
    @GetSchoolId() schoolId: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.salaryService.createTransaction(dto, schoolId, userId);
    return ApiResponse.created(data, 'Salary transaction created');
  }

  @Get('transactions')
  @Permissions(PERMISSION_REGISTRY.salary.view)
  @ApiOperation({ summary: 'List salary transactions' })
  async findAllTransactions(
    @GetSchoolId() schoolId: string,
    @Query() filters: FilterSalaryTransactionDto,
  ) {
    const data = await this.salaryService.findAllTransactions(schoolId, filters);
    return ApiResponse.success(data.items, 'Transactions fetched', data.meta);
  }

  @Post('transactions/:id/process')
  @Permissions(PERMISSION_REGISTRY.salary.process)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process (approve) a pending salary transaction' })
  async processTransaction(@Param('id') id: string, @GetSchoolId() schoolId: string) {
    const data = await this.salaryService.processTransaction(id, schoolId);
    return ApiResponse.success(data, 'Salary transaction processed');
  }

  @Delete('transactions/:id')
  @Permissions(PERMISSION_REGISTRY.salary.delete)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a pending salary transaction' })
  async deleteTransaction(@Param('id') id: string, @GetSchoolId() schoolId: string) {
    await this.salaryService.deleteTransaction(id, schoolId);
    return ApiResponse.noContent('Salary transaction deleted');
  }
}
