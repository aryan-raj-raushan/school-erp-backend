import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
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

  private async assertNameAvailable(name: string, excludeId?: string): Promise<void> {
    const existing = await this.plansRepo.findByName(name);
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`A plan named '${name}' already exists`);
    }
  }

  private static pricingColumns(
    billingModel: BillingModel,
    flatAmount?: number,
    pricePerStudent?: number,
  ): { flat_amount: string | null; price_per_student: string | null } {
    return billingModel === BillingModel.FLAT
      ? { flat_amount: String(flatAmount), price_per_student: null }
      : { flat_amount: null, price_per_student: String(pricePerStudent) };
  }

  async create(dto: CreateSubscriptionPlanDto, createdBy: string): Promise<SubscriptionPlanEntity> {
    this.assertPricingFields(dto.billing_model, dto.flat_amount, dto.price_per_student);
    await this.assertNameAvailable(dto.name);
    return this.plansRepo.create({
      id: generateId(),
      created_by: createdBy,
      name: dto.name,
      billing_model: dto.billing_model,
      ...SubscriptionPlansService.pricingColumns(
        dto.billing_model,
        dto.flat_amount,
        dto.price_per_student,
      ),
      billing_cycle: dto.billing_cycle,
      is_active: dto.is_active ?? true,
    });
  }

  async update(id: string, dto: UpdateSubscriptionPlanDto): Promise<SubscriptionPlanEntity> {
    const existing = await this.findById(id);
    if (dto.name) await this.assertNameAvailable(dto.name, id);

    const { flat_amount, price_per_student, ...planFields } = dto;
    const pricingChanged =
      dto.billing_model !== undefined ||
      flat_amount !== undefined ||
      price_per_student !== undefined;
    if (!pricingChanged) return this.plansRepo.update(id, planFields);

    const billingModel = dto.billing_model ?? (existing.billing_model as BillingModel);
    const flatAmount =
      flat_amount ?? (existing.flat_amount ? Number(existing.flat_amount) : undefined);
    const pricePerStudent =
      price_per_student ??
      (existing.price_per_student ? Number(existing.price_per_student) : undefined);
    this.assertPricingFields(billingModel, flatAmount, pricePerStudent);

    return this.plansRepo.update(id, {
      ...planFields,
      ...SubscriptionPlansService.pricingColumns(billingModel, flatAmount, pricePerStudent),
    });
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    const inUse = await this.plansRepo.countCurrentSubscriptions(id);
    if (inUse > 0) {
      throw new ConflictException(
        `This plan is used by ${inUse} current subscription(s) — deactivate it instead`,
      );
    }
    await this.plansRepo.delete(id);
  }
}
