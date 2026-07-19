import { Injectable, Inject } from '@nestjs/common';
import { eq, and, ilike, sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { subscriptionPlans } from '../../database/drizzle/schema';
import { SubscriptionPlanFilterDto } from './dto/subscription-plan-filter.dto';
import { SubscriptionPlanEntity, NewSubscriptionPlan } from './types/subscription-plan.types';

@Injectable()
export class SubscriptionPlansRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  async findAll(filters: SubscriptionPlanFilterDto): Promise<SubscriptionPlanEntity[]> {
    const conditions = [];
    if (filters.search) conditions.push(ilike(subscriptionPlans.name, `%${filters.search}%`));
    if (filters.billing_model)
      conditions.push(eq(subscriptionPlans.billing_model, filters.billing_model));
    if (filters.is_active !== undefined)
      conditions.push(eq(subscriptionPlans.is_active, filters.is_active));

    const limit = filters.limit ?? 20;
    const offset = ((filters.page ?? 1) - 1) * limit;

    return this.db
      .select()
      .from(subscriptionPlans)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(limit)
      .offset(offset);
  }

  async count(filters: SubscriptionPlanFilterDto): Promise<number> {
    const conditions = [];
    if (filters.search) conditions.push(ilike(subscriptionPlans.name, `%${filters.search}%`));
    if (filters.billing_model)
      conditions.push(eq(subscriptionPlans.billing_model, filters.billing_model));
    if (filters.is_active !== undefined)
      conditions.push(eq(subscriptionPlans.is_active, filters.is_active));

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(subscriptionPlans)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    return Number(count);
  }

  async findById(id: string): Promise<SubscriptionPlanEntity | undefined> {
    const [row] = await this.db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, id));
    return row;
  }

  async create(data: NewSubscriptionPlan): Promise<SubscriptionPlanEntity> {
    const [row] = await this.db.insert(subscriptionPlans).values(data).returning();
    return row;
  }

  async update(id: string, data: Partial<NewSubscriptionPlan>): Promise<SubscriptionPlanEntity> {
    const [row] = await this.db
      .update(subscriptionPlans)
      .set({ ...data, updated_at: new Date() })
      .where(eq(subscriptionPlans.id, id))
      .returning();
    return row;
  }
}
