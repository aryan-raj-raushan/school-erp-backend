import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SubscriptionsRepository } from './subscriptions.repository';
import { SubscriptionPlansRepository } from '../subscription-plans/subscription-plans.repository';
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
import { CompanyRole, SubscriptionPlan, BillingModel } from '../../shared/enums';
import { CacheTTL } from '../../shared/constants';
import { APP_EVENTS } from '../../shared/events/event-names';
import { SubscriptionAssignedEvent } from './events/subscription.events';
import { addBillingCycle } from './utils/billing-cycle.utils';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly subscriptionsRepo: SubscriptionsRepository,
    private readonly plansRepo: SubscriptionPlansRepository,
    private readonly redisService: RedisService,
    private readonly events: EventEmitter2,
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

    let plan_name: string;
    let plan_type: SubscriptionPlan;
    let billing_model: BillingModel;
    let amount: number | undefined;
    let price_per_student: number | undefined;

    if (dto.plan_id) {
      const plan = await this.plansRepo.findById(dto.plan_id);
      if (!plan) throw new NotFoundException(`Subscription plan '${dto.plan_id}' not found`);
      plan_name = plan.name;
      plan_type = plan.billing_cycle as SubscriptionPlan;
      billing_model = plan.billing_model as BillingModel;
      amount = plan.flat_amount != null ? Number(plan.flat_amount) : undefined;
      price_per_student =
        plan.price_per_student != null ? Number(plan.price_per_student) : undefined;
    } else {
      if (!dto.plan_name || !dto.plan_type || !dto.billing_model) {
        throw new BadRequestException(
          'plan_name, plan_type and billing_model are required when plan_id is not provided',
        );
      }
      if (dto.billing_model === BillingModel.FLAT && dto.amount == null) {
        throw new BadRequestException('amount is required for a FLAT billing subscription');
      }
      if (dto.billing_model === BillingModel.PER_STUDENT && dto.price_per_student == null) {
        throw new BadRequestException(
          'price_per_student is required for a PER_STUDENT billing subscription',
        );
      }
      plan_name = dto.plan_name;
      plan_type = dto.plan_type;
      billing_model = dto.billing_model;
      amount = dto.amount;
      price_per_student = dto.price_per_student;
    }

    // Postpaid: the school gets access immediately and is billed in arrears
    // at the end of each cycle — there's no "pending" gate to wait behind.
    const start_date = dto.start_date ? new Date(dto.start_date) : new Date();

    const sub = await this.subscriptionsRepo.create({
      id: generateId(),
      created_by: userId,
      status: 'ACTIVE',
      school_id: dto.school_id,
      plan_id: dto.plan_id,
      plan_name,
      plan_type,
      billing_model,
      amount: amount != null ? String(amount) : undefined,
      price_per_student: price_per_student != null ? String(price_per_student) : undefined,
      currency: dto.currency,
      max_students: dto.max_students,
      max_staff: dto.max_staff,
      features: dto.features,
      is_trial: dto.is_trial,
      auto_renew: dto.auto_renew,
      grace_period_days: dto.grace_period_days ?? 0,
      restriction_mode: dto.restriction_mode ?? 'NONE',
      restricted_resources: dto.restricted_resources ?? [],
      payment_methods_allowed: dto.payment_methods_allowed ?? [],
      start_date,
      next_billing_date: addBillingCycle(start_date, plan_type),
      end_date: dto.end_date ? new Date(dto.end_date) : undefined,
      trial_end_date: dto.trial_end_date ? new Date(dto.trial_end_date) : undefined,
    });

    // Downstream billing work (e.g. seeding the first invoice) happens off
    // this event instead of a direct InvoicesService call — see the
    // "events over service-to-service calls" rule in the project plan.
    await this.events.emitAsync(APP_EVENTS.BILLING.SUBSCRIPTION_ASSIGNED, {
      subscriptionId: sub.id,
      schoolId: sub.school_id,
    } satisfies SubscriptionAssignedEvent);

    // .del() deletes an exact key, not a pattern — must use delByPattern()
    // here or newly-created subscriptions stay invisible behind a stale
    // cached list until CacheTTL.MEDIUM expires.
    await this.redisService.delByPattern(`*subscriptions:list:*`);
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
      amount: dto.amount != null ? String(dto.amount) : undefined,
      price_per_student: dto.price_per_student != null ? String(dto.price_per_student) : undefined,
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
