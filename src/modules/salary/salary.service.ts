import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SalaryRepository } from './salary.repository';
import { RedisService } from '../redis/redis.service';
import { CacheTTL } from '../../shared/constants/cache.constants';
import { generateId } from '../../utils/uuid.utils';
import { PaginationResponse } from '../../shared/responses/api-response';
import { CreateSalaryHeadDto } from './dto/create-salary-head.dto';
import { UpdateSalaryHeadDto } from './dto/update-salary-head.dto';
import { CreateSalaryTemplateDto } from './dto/create-salary-template.dto';
import { UpdateSalaryTemplateDto } from './dto/update-salary-template.dto';
import { AssignSalaryStructureDto } from './dto/assign-salary-structure.dto';
import { CreateSalaryTransactionDto } from './dto/create-salary-transaction.dto';
import { FilterSalaryHeadDto, FilterSalaryTransactionDto } from './dto/filter-salary.dto';
import {
  SalaryHead,
  SalaryTemplateWithItems,
  SalaryAssignmentWithRelations,
  SalaryTransactionWithRelations,
} from './types/salary.types';

@Injectable()
export class SalaryService {
  constructor(
    private readonly salaryRepo: SalaryRepository,
    private readonly redisService: RedisService,
  ) {}

  private headKey(schoolId: string) {
    return `salary:heads:${schoolId}`;
  }
  private templateKey(schoolId: string) {
    return `salary:templates:${schoolId}`;
  }
  private assignKey(schoolId: string) {
    return `salary:assignments:${schoolId}`;
  }
  private txnKey(schoolId: string) {
    return `salary:transactions:${schoolId}`;
  }

  // ─── HEADS ──────────────────────────────────────────────────────────────────

  async findAllHeads(
    schoolId: string,
    filters: FilterSalaryHeadDto,
  ): Promise<PaginationResponse<SalaryHead>> {
    const key = `${this.headKey(schoolId)}:list:${JSON.stringify(filters)}`;
    return this.redisService.getOrSet(key, CacheTTL.MEDIUM, async () => {
      const [items, total] = await Promise.all([
        this.salaryRepo.findAllHeads(schoolId, filters),
        this.salaryRepo.countHeads(schoolId, filters),
      ]);
      return PaginationResponse.of(items, total, filters);
    });
  }

  async findHeadById(id: string, schoolId: string): Promise<SalaryHead> {
    const head = await this.salaryRepo.findHeadById(id, schoolId);
    if (!head) throw new NotFoundException(`Salary head '${id}' not found`);
    return head;
  }

  async createHead(
    dto: CreateSalaryHeadDto,
    schoolId: string,
    createdBy: string,
  ): Promise<SalaryHead> {
    const head = await this.salaryRepo.createHead({
      id: generateId(),
      school_id: schoolId,
      created_by: createdBy,
      name: dto.name,
      head_type: dto.head_type,
      code: dto.code,
      is_enabled: dto.is_enabled ?? true,
    });
    await this.redisService.delByPattern(`${this.headKey(schoolId)}:*`);
    return head;
  }

  async updateHead(id: string, schoolId: string, dto: UpdateSalaryHeadDto): Promise<SalaryHead> {
    await this.findHeadById(id, schoolId);
    const updated = await this.salaryRepo.updateHead(id, schoolId, dto);
    if (!updated) throw new NotFoundException(`Salary head '${id}' not found`);
    await this.redisService.delByPattern(`${this.headKey(schoolId)}:*`);
    return updated;
  }

  async removeHead(id: string, schoolId: string): Promise<void> {
    await this.findHeadById(id, schoolId);
    await this.salaryRepo.softDeleteHead(id, schoolId);
    await this.redisService.delByPattern(`${this.headKey(schoolId)}:*`);
  }

  // ─── TEMPLATES ──────────────────────────────────────────────────────────────

  async findAllTemplates(schoolId: string): Promise<SalaryTemplateWithItems[]> {
    const key = `${this.templateKey(schoolId)}:list`;
    return this.redisService.getOrSet(key, CacheTTL.MEDIUM, () =>
      this.salaryRepo.findAllTemplates(schoolId),
    );
  }

  async findTemplateById(id: string, schoolId: string): Promise<SalaryTemplateWithItems> {
    const tpl = await this.salaryRepo.findTemplateById(id, schoolId);
    if (!tpl) throw new NotFoundException(`Salary template '${id}' not found`);
    return tpl;
  }

  async createTemplate(
    dto: CreateSalaryTemplateDto,
    schoolId: string,
    createdBy: string,
  ): Promise<SalaryTemplateWithItems> {
    const tpl = await this.salaryRepo.createTemplate({
      id: generateId(),
      school_id: schoolId,
      created_by: createdBy,
      name: dto.name,
      is_enabled: dto.is_enabled ?? true,
    });
    await this.salaryRepo.replaceTemplateItems(
      tpl.id,
      dto.items.map((i) => ({
        template_id: tpl.id,
        salary_head_id: i.salary_head_id,
        default_amount: String(i.default_amount ?? 0),
      })),
    );
    await this.redisService.delByPattern(`${this.templateKey(schoolId)}:*`);
    return this.findTemplateById(tpl.id, schoolId);
  }

  async updateTemplate(
    id: string,
    schoolId: string,
    dto: UpdateSalaryTemplateDto,
  ): Promise<SalaryTemplateWithItems> {
    await this.findTemplateById(id, schoolId);
    await this.salaryRepo.updateTemplate(id, schoolId, {
      name: dto.name,
      is_enabled: dto.is_enabled,
    });
    if (dto.items) {
      await this.salaryRepo.replaceTemplateItems(
        id,
        dto.items.map((i) => ({
          template_id: id,
          salary_head_id: i.salary_head_id,
          default_amount: String(i.default_amount ?? 0),
        })),
      );
    }
    await this.redisService.delByPattern(`${this.templateKey(schoolId)}:*`);
    return this.findTemplateById(id, schoolId);
  }

  async removeTemplate(id: string, schoolId: string): Promise<void> {
    await this.findTemplateById(id, schoolId);
    await this.salaryRepo.softDeleteTemplate(id, schoolId);
    await this.redisService.delByPattern(`${this.templateKey(schoolId)}:*`);
  }

  // ─── ASSIGNMENTS ─────────────────────────────────────────────────────────────

  async findAllAssignments(schoolId: string): Promise<SalaryAssignmentWithRelations[]> {
    const key = `${this.assignKey(schoolId)}:list`;
    return this.redisService.getOrSet(key, CacheTTL.MEDIUM, () =>
      this.salaryRepo.findAllAssignments(schoolId),
    );
  }

  async findAssignmentsByEmployee(
    schoolId: string,
    employeeId: string,
  ): Promise<SalaryAssignmentWithRelations[]> {
    const key = `${this.assignKey(schoolId)}:emp:${employeeId}`;
    return this.redisService.getOrSet(key, CacheTTL.MEDIUM, () =>
      this.salaryRepo.findAssignmentsByEmployee(schoolId, employeeId),
    );
  }

  async assignStructure(
    dto: AssignSalaryStructureDto,
    schoolId: string,
    createdBy: string,
  ): Promise<SalaryAssignmentWithRelations> {
    await this.findTemplateById(dto.template_id, schoolId);
    const assignment = await this.salaryRepo.createAssignment({
      id: generateId(),
      school_id: schoolId,
      created_by: createdBy,
      employee_id: dto.employee_id,
      template_id: dto.template_id,
      effective_from: dto.effective_from,
      remarks: dto.remarks,
      is_active: true,
    });
    await this.redisService.delByPattern(`${this.assignKey(schoolId)}:*`);
    const full = await this.salaryRepo.findAssignmentsByEmployee(schoolId, dto.employee_id);
    return full.find((a) => a.id === assignment.id)!;
  }

  async deactivateAssignment(id: string, schoolId: string): Promise<void> {
    await this.salaryRepo.deactivateAssignment(id, schoolId);
    await this.redisService.delByPattern(`${this.assignKey(schoolId)}:*`);
  }

  // ─── TRANSACTIONS ────────────────────────────────────────────────────────────

  async findAllTransactions(
    schoolId: string,
    filters: FilterSalaryTransactionDto,
  ): Promise<PaginationResponse<SalaryTransactionWithRelations>> {
    const key = `${this.txnKey(schoolId)}:list:${JSON.stringify(filters)}`;
    return this.redisService.getOrSet(key, CacheTTL.SHORT, async () => {
      const [items, total] = await Promise.all([
        this.salaryRepo.findAllTransactions(schoolId, filters),
        this.salaryRepo.countTransactions(schoolId, filters),
      ]);
      return PaginationResponse.of(items, total, filters);
    });
  }

  async createTransaction(dto: CreateSalaryTransactionDto, schoolId: string, createdBy: string) {
    const txn = await this.salaryRepo.createTransaction({
      id: generateId(),
      school_id: schoolId,
      created_by: createdBy,
      employee_id: dto.employee_id,
      salary_month: dto.salary_month,
      total_amount: String(dto.total_amount),
      payment_mode: dto.payment_mode,
      deduction_amount: String(dto.deduction_amount ?? 0),
      payment_release_date: dto.payment_release_date,
      from_account_id: dto.from_account_id || null,
      expense_head_id: dto.expense_head_id || null,
      remarks: dto.remarks,
      status: 'PENDING',
    });
    await this.redisService.delByPattern(`${this.txnKey(schoolId)}:*`);
    return txn;
  }

  async processTransaction(id: string, schoolId: string) {
    const txn = await this.salaryRepo.findTransactionById(id, schoolId);
    if (!txn) throw new NotFoundException(`Salary transaction '${id}' not found`);
    if (txn.status !== 'PENDING')
      throw new BadRequestException(`Transaction is already ${txn.status}`);
    const updated = await this.salaryRepo.updateTransactionStatus(id, schoolId, 'PROCESSED');
    await this.redisService.delByPattern(`${this.txnKey(schoolId)}:*`);
    return updated;
  }

  async deleteTransaction(id: string, schoolId: string): Promise<void> {
    const txn = await this.salaryRepo.findTransactionById(id, schoolId);
    if (!txn) throw new NotFoundException(`Salary transaction '${id}' not found`);
    if (txn.status !== 'PENDING')
      throw new BadRequestException('Only PENDING transactions can be deleted');
    await this.salaryRepo.softDeleteTransaction(id, schoolId);
    await this.redisService.delByPattern(`${this.txnKey(schoolId)}:*`);
  }
}
