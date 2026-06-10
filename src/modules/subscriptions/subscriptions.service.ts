import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
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
import { CompanyRole, SubscriptionPlan } from '../../shared/enums';
import { CacheTTL } from '../../shared/constants';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly subscriptionsRepo: SubscriptionsRepository,
    private readonly redisService: RedisService,
  ) {}

  // BUG-008/009/010: tenant isolation helpers
  private async getPermittedSchoolIds(userId: string, role: string): Promise<string[] | null> {
    if (role === CompanyRole.SUPER_ADMIN) return null;

    const key = `company_user:${userId}:schools`;
    let ids = await this.redisService.smembers(key);

    if (ids.length === 0) {
      ids = await this.subscriptionsRepo.findSchoolIdsByCompanyUserId(userId);
      if (ids.length > 0) {
        await this.redisService.sadd(key, ...ids);
        await this.redisService.expire(key, CacheTTL.HOUR);
      }
    }

    return ids;
  }

  private async assertSchoolAccess(schoolId: string, userId: string, role: string): Promise<void> {
    const permitted = await this.getPermittedSchoolIds(userId, role);
    if (permitted !== null && !permitted.includes(schoolId)) {
      throw new ForbiddenException('Access denied to this school');
    }
  }

  async findAll(
    filters: SubscriptionFilterDto,
    userId: string,
    role: string,
  ): Promise<PaginationResponse<Subscription>> {
    const permitted = await this.getPermittedSchoolIds(userId, role);

    // For non-SUPER_ADMIN, force filter to their permitted schools only
    const scopedFilters = { ...filters };
    if (permitted !== null) {
      if (scopedFilters.school_id && !permitted.includes(scopedFilters.school_id)) {
        throw new ForbiddenException('Access denied to this school');
      }
      if (!scopedFilters.school_id && permitted.length > 0) {
        // will be filtered below — pass first permitted for now handled in repo
        // NOTE: for multi-school ADMIN, the list query needs to be scoped
        // We pass school_id restriction through the filter for now
      }
    }

    const cacheKey = `subscriptions:list:${userId}:${JSON.stringify(scopedFilters)}`;
    return this.redisService.getOrSet(cacheKey, CacheTTL.MEDIUM, async () => {
      const [items, total] = await Promise.all([
        this.subscriptionsRepo.findAll(scopedFilters, permitted ?? undefined),
        this.subscriptionsRepo.count(scopedFilters, permitted ?? undefined),
      ]);
      return PaginationResponse.of(items, total, scopedFilters);
    });
  }

  async findById(id: string, userId: string, role: string): Promise<Subscription> {
    const sub = await this.subscriptionsRepo.findById(id);
    if (!sub) throw new NotFoundException(`Subscription '${id}' not found`);
    await this.assertSchoolAccess(sub.school_id, userId, role);
    return sub;
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

  async create(dto: CreateSubscriptionDto, userId: string, role: string): Promise<Subscription> {
    await this.assertSchoolAccess(dto.school_id, userId, role);
    const sub = await this.subscriptionsRepo.create({
      id: generateId(),
      created_by: userId,
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

  async update(
    id: string,
    dto: UpdateSubscriptionDto,
    userId: string,
    role: string,
  ): Promise<Subscription> {
    await this.findById(id, userId, role);
    const updated = await this.subscriptionsRepo.update(id, {
      ...dto,
      amount: dto.amount ? String(dto.amount) : undefined,
      start_date: dto.start_date ? new Date(dto.start_date) : undefined,
      end_date: dto.end_date ? new Date(dto.end_date) : undefined,
      trial_end_date: dto.trial_end_date ? new Date(dto.trial_end_date) : undefined,
    });
    await this.invalidateCache(id, updated.school_id);
    return updated;
  }

  async cancel(
    id: string,
    dto: CancelSubscriptionDto,
    userId: string,
    role: string,
  ): Promise<Subscription> {
    const sub = await this.findById(id, userId, role);
    const updated = await this.subscriptionsRepo.update(id, {
      status: 'CANCELLED',
      cancelled_at: new Date(),
      cancellation_reason: dto.cancellation_reason,
    });
    await this.invalidateCache(id, sub.school_id);
    return updated;
  }

  async getPayments(
    subscriptionId: string,
    userId: string,
    role: string,
  ): Promise<SubscriptionPayment[]> {
    await this.findById(subscriptionId, userId, role);
    return this.subscriptionsRepo.findPayments(subscriptionId);
  }

  async addPayment(
    subscriptionId: string,
    dto: CreatePaymentDto,
    createdBy: string,
    userId: string,
    role: string,
  ): Promise<SubscriptionPayment> {
    const sub = await this.findById(subscriptionId, userId, role);

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
