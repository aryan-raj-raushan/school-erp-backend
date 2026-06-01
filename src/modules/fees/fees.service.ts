import { Injectable, NotFoundException } from '@nestjs/common';
import { FeesRepository } from './fees.repository';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { PaginationResponse } from '../../shared/responses/api-response';
import { CreateFeeMasterTypeDto } from './dto/create-fee-master-type.dto';
import { UpdateFeeMasterTypeDto } from './dto/update-fee-master-type.dto';
import { CreateFeeDto, BulkCreateFeeDto } from './dto/create-fee.dto';
import { ManualPaymentDto } from './dto/manual-payment.dto';
import { FeeMasterType, FeeReceipt, FeePayment } from './types/fee.types';
import { FeeStatus } from '../../shared/enums';

const CACHE_TTL = 120;

@Injectable()
export class FeesService {
  constructor(
    private readonly feesRepo: FeesRepository,
    private readonly redisService: RedisService,
  ) {}

  private cacheKey(schoolId: string) {
    return `fees:${schoolId}`;
  }

  // Fee Master Types
  async findAllMasterTypes(schoolId: string): Promise<FeeMasterType[]> {
    return this.redisService.getOrSet(`${this.cacheKey(schoolId)}:master-types`, CACHE_TTL, () =>
      this.feesRepo.findAllMasterTypes(schoolId),
    );
  }

  async findMasterTypeById(id: string, schoolId: string): Promise<FeeMasterType> {
    const item = await this.feesRepo.findMasterTypeById(id, schoolId);
    if (!item) throw new NotFoundException(`Fee type with id '${id}' not found`);
    return item;
  }

  async createMasterType(dto: CreateFeeMasterTypeDto, schoolId: string, createdBy: string): Promise<FeeMasterType> {
    const item = await this.feesRepo.createMasterType({ id: generateId(), school_id: schoolId, created_by: createdBy, ...dto });
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return item;
  }

  async updateMasterType(id: string, schoolId: string, dto: UpdateFeeMasterTypeDto): Promise<FeeMasterType> {
    await this.findMasterTypeById(id, schoolId);
    const updated = await this.feesRepo.updateMasterType(id, schoolId, dto);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return updated;
  }

  async deleteMasterType(id: string, schoolId: string): Promise<void> {
    await this.findMasterTypeById(id, schoolId);
    await this.feesRepo.softDeleteMasterType(id, schoolId);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
  }

  // Fee Receipts
  async findAllReceipts(schoolId: string, page = 1, limit = 20, studentId?: string): Promise<PaginationResponse<FeeReceipt>> {
    const items = await this.feesRepo.findAllReceipts(schoolId, page, limit, studentId);
    return PaginationResponse.of(items, items.length, { page, limit });
  }

  async findReceiptById(id: string, schoolId: string): Promise<FeeReceipt> {
    const receipt = await this.feesRepo.findReceiptById(id, schoolId);
    if (!receipt) throw new NotFoundException(`Fee receipt with id '${id}' not found`);
    return receipt;
  }

  async createSingle(dto: CreateFeeDto, schoolId: string, createdBy: string): Promise<FeeReceipt> {
    return this.createReceiptFromDto(dto, schoolId, createdBy);
  }

  async createBulk(dto: BulkCreateFeeDto, schoolId: string, createdBy: string): Promise<FeeReceipt[]> {
    const results: FeeReceipt[] = [];
    for (const fee of dto.fees) {
      results.push(await this.createReceiptFromDto(fee, schoolId, createdBy));
    }
    return results;
  }

  async createPaymentOrder(receiptId: string, schoolId: string): Promise<{ orderId: string; amount: number }> {
    const receipt = await this.findReceiptById(receiptId, schoolId);
    const outstanding = Number(receipt.total_amount) - Number(receipt.discount_amount ?? 0) - Number(receipt.paid_amount ?? 0);
    const orderId = `ORD-${generateId()}`;
    await this.feesRepo.updateReceipt(receiptId, schoolId, { updated_at: new Date() });
    return { orderId, amount: outstanding };
  }

  async recordManualPayment(receiptId: string, schoolId: string, dto: ManualPaymentDto, createdBy: string): Promise<FeePayment> {
    const receipt = await this.findReceiptById(receiptId, schoolId);
    const payment = await this.feesRepo.createPayment({
      id: generateId(),
      school_id: schoolId,
      receipt_id: receiptId,
      amount: String(dto.amount),
      payment_mode: dto.payment_mode,
      transaction_id: dto.transaction_id,
      notes: dto.notes,
      created_by: createdBy,
    });

    const newPaid = Number(receipt.paid_amount ?? 0) + dto.amount;
    const outstanding = Number(receipt.total_amount) - Number(receipt.discount_amount ?? 0) - newPaid;
    const status: FeeStatus = outstanding <= 0 ? FeeStatus.PAID : newPaid > 0 ? FeeStatus.PARTIAL : FeeStatus.PENDING;

    await this.feesRepo.updateReceipt(receiptId, schoolId, {
      paid_amount: String(newPaid),
      status,
    });

    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return payment;
  }

  async getParentFees(schoolId: string, studentIds: string[], page = 1, limit = 20): Promise<PaginationResponse<FeeReceipt>> {
    const items: FeeReceipt[] = [];
    for (const sid of studentIds) {
      const studentFees = await this.feesRepo.findAllReceipts(schoolId, 1, 100, sid);
      items.push(...studentFees);
    }
    return PaginationResponse.of(items, items.length, { page, limit });
  }

  private async createReceiptFromDto(dto: CreateFeeDto, schoolId: string, createdBy: string): Promise<FeeReceipt> {
    const totalAmount = dto.fee_items.reduce((sum, item) => sum + item.amount, 0);
    const receiptNumber = await this.feesRepo.getNextReceiptNumber(schoolId);

    const receipt = await this.feesRepo.createReceipt({
      id: generateId(),
      school_id: schoolId,
      student_id: dto.student_id,
      academic_year_id: dto.academic_year_id,
      receipt_number: receiptNumber,
      total_amount: String(totalAmount),
      discount_amount: String(dto.discount_amount ?? 0),
      due_date: dto.due_date,
      fee_items: dto.fee_items,
      notes: dto.notes,
      created_by: createdBy,
    });

    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return receipt;
  }
}
