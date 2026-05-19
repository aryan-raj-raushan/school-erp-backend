import { Injectable, NotFoundException } from '@nestjs/common';
import { SubscriptionsRepository } from './subscriptions.repository';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { DateUtils } from '../../utils/date.utils';
import { PaginationResponse } from '../../shared/responses/api-response';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';
import { SubscriptionFilterDto } from './dto/subscription-filter.dto';
import { Subscription, SubscriptionPayment } from './types/subscription.types';
import { SubscriptionPlan } from '../../shared/enums';

const CACHE_TTL = 120;

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly subscriptionsRepo: SubscriptionsRepository,
    private readonly redisService: RedisService,
  ) {}

  async findAll(filters: SubscriptionFilterDto): Promise<PaginationResponse<Subscription>> {
    const cacheKey = `subscriptions:list:${JSON.stringify(filters)}`;
    return this.redisService.getOrSet(cacheKey, CACHE_TTL, async () => {
      const [items, total] = await Promise.all([
        this.subscriptionsRepo.findAll(filters),
        this.subscriptionsRepo.count(filters),
      ]);
      return PaginationResponse.of(items, total, filters);
    });
  }

  async findById(id: string): Promise<Subscription> {
    const cacheKey = `subscriptions:${id}`;
    return this.redisService.getOrSet(cacheKey, CACHE_TTL, async () => {
      const sub = await this.subscriptionsRepo.findById(id);
      if (!sub) throw new NotFoundException(`Subscription '${id}' not found`);
      return sub;
    });
  }

  async findBySchoolId(schoolId: string): Promise<Subscription | null> {
    const cacheKey = `subscription_status:${schoolId}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) return JSON.parse(cached) as Subscription;

    const sub = await this.subscriptionsRepo.findActiveBySchoolId(schoolId);
    if (sub) {
      await this.redisService.setex(cacheKey, 3600, JSON.stringify(sub));
    }
    return sub ?? null;
  }

  async create(dto: CreateSubscriptionDto, createdBy: string): Promise<Subscription> {
    const sub = await this.subscriptionsRepo.create({
      id: generateId(),
      created_by: createdBy,
      status: 'PENDING',
      ...dto,
      amount: String(dto.amount),
      start_date: dto.start_date ? new Date(dto.start_date) : undefined,
      end_date: dto.end_date ? new Date(dto.end_date) : undefined,
      trial_end_date: dto.trial_end_date ? new Date(dto.trial_end_date) : undefined,
    });
    await this.redisService.del(`subscriptions:list:*`);
    return sub;
  }

  async update(id: string, dto: UpdateSubscriptionDto): Promise<Subscription> {
    await this.findById(id);
    const updated = await this.subscriptionsRepo.update(id, {
      ...dto,
      amount: dto.amount ? String(dto.amount) : undefined,
      start_date: dto.start_date ? new Date(dto.start_date) : undefined,
      end_date: dto.end_date ? new Date(dto.end_date) : undefined,
    });
    await this.invalidateCache(id, updated.school_id);
    return updated;
  }

  async cancel(id: string, dto: CancelSubscriptionDto): Promise<Subscription> {
    const sub = await this.findById(id);
    const updated = await this.subscriptionsRepo.update(id, {
      status: 'CANCELLED',
      cancelled_at: new Date(),
      cancellation_reason: dto.cancellation_reason,
    });
    await this.invalidateCache(id, sub.school_id);
    return updated;
  }

  async getPayments(subscriptionId: string): Promise<SubscriptionPayment[]> {
    await this.findById(subscriptionId);
    return this.subscriptionsRepo.findPayments(subscriptionId);
  }

  async addPayment(
    subscriptionId: string,
    dto: CreatePaymentDto,
    createdBy: string,
  ): Promise<SubscriptionPayment> {
    const sub = await this.findById(subscriptionId);

    const payment = await this.subscriptionsRepo.createPayment({
      id: generateId(),
      subscription_id: subscriptionId,
      school_id: sub.school_id,
      created_by: createdBy,
      status: dto.is_manual ? 'SUCCESS' : 'PENDING',
      paid_at: dto.is_manual ? new Date() : undefined,
      ...dto,
      amount: String(dto.amount),
    });

    if (dto.is_manual) {
      const startDate = new Date();
      const endDate = this.calcEndDate(startDate, sub.plan_type);
      await this.subscriptionsRepo.update(subscriptionId, {
        status: 'ACTIVE',
        start_date: startDate,
        end_date: endDate,
      });
      await this.invalidateCache(subscriptionId, sub.school_id);
    }

    return payment;
  }

  private calcEndDate(start: Date, planType: string): Date {
    const monthsMap: Record<string, number> = {
      [SubscriptionPlan.MONTHLY]: 1,
      [SubscriptionPlan.QUARTERLY]: 3,
      [SubscriptionPlan.HALF_YEARLY]: 6,
      [SubscriptionPlan.ANNUAL]: 12,
    };
    const months = monthsMap[planType] ?? 1;
    return DateUtils.addMonths(start, months);
  }

  private async invalidateCache(id: string, schoolId: string): Promise<void> {
    await Promise.all([
      this.redisService.del(`subscriptions:${id}`),
      this.redisService.del(`subscription_status:${schoolId}`),
      this.redisService.delByPattern(`*subscriptions:list:*`),
    ]);
  }
}
