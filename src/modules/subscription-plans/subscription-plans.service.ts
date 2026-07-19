import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SubscriptionPlansRepository } from './subscription-plans.repository';
import { generateId } from '../../utils/uuid.utils';
import { PaginationResponse } from '../../shared/responses/api-response';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { SubscriptionPlanFilterDto } from './dto/subscription-plan-filter.dto';
import { BillingModel } from '../../shared/enums';
import { SubscriptionPlanEntity } from './types/subscription-plan.types';

@Injectable()
export class SubscriptionPlansService {
  constructor(private readonly plansRepo: SubscriptionPlansRepository) {}

  async findAll(
    filters: SubscriptionPlanFilterDto,
  ): Promise<PaginationResponse<SubscriptionPlanEntity>> {
    const [items, total] = await Promise.all([
      this.plansRepo.findAll(filters),
      this.plansRepo.count(filters),
    ]);
    return PaginationResponse.of(items, total, filters);
  }

  async findById(id: string): Promise<SubscriptionPlanEntity> {
    const plan = await this.plansRepo.findById(id);
    if (!plan) throw new NotFoundException(`Subscription plan '${id}' not found`);
    return plan;
  }

  private assertPricingFields(
    billingModel: BillingModel,
    flatAmount?: number,
    pricePerStudent?: number,
  ): void {
    if (billingModel === BillingModel.FLAT && flatAmount == null) {
      throw new BadRequestException('flat_amount is required for a FLAT billing plan');
    }
    if (billingModel === BillingModel.PER_STUDENT && pricePerStudent == null) {
      throw new BadRequestException('price_per_student is required for a PER_STUDENT billing plan');
    }
  }

  async create(dto: CreateSubscriptionPlanDto, createdBy: string): Promise<SubscriptionPlanEntity> {
    this.assertPricingFields(dto.billing_model, dto.flat_amount, dto.price_per_student);
    return this.plansRepo.create({
      id: generateId(),
      created_by: createdBy,
      name: dto.name,
      billing_model: dto.billing_model,
      flat_amount: dto.flat_amount != null ? String(dto.flat_amount) : undefined,
      price_per_student: dto.price_per_student != null ? String(dto.price_per_student) : undefined,
      billing_cycle: dto.billing_cycle,
      is_active: dto.is_active ?? true,
    });
  }

  async update(id: string, dto: UpdateSubscriptionPlanDto): Promise<SubscriptionPlanEntity> {
    const existing = await this.findById(id);
    const billingModel = dto.billing_model ?? (existing.billing_model as BillingModel);
    if (dto.billing_model || dto.flat_amount !== undefined || dto.price_per_student !== undefined) {
      this.assertPricingFields(
        billingModel,
        dto.flat_amount ?? (existing.flat_amount ? Number(existing.flat_amount) : undefined),
        dto.price_per_student ??
          (existing.price_per_student ? Number(existing.price_per_student) : undefined),
      );
    }
    return this.plansRepo.update(id, {
      ...dto,
      flat_amount: dto.flat_amount != null ? String(dto.flat_amount) : undefined,
      price_per_student: dto.price_per_student != null ? String(dto.price_per_student) : undefined,
    });
  }
}
