import { Injectable, Inject } from '@nestjs/common';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import {
  subscriptions,
  subscriptionPayments,
  companyUserSchools,
} from '../../database/drizzle/schema';
import {
  Subscription,
  NewSubscription,
  SubscriptionPayment,
  NewSubscriptionPayment,
} from './types/subscription.types';
import { SubscriptionFilterDto } from './dto/subscription-filter.dto';

@Injectable()
export class SubscriptionsRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  async findAll(
    filters: SubscriptionFilterDto,
    allowedSchoolIds?: string[],
  ): Promise<Subscription[]> {
    const conditions = [];
    if (allowedSchoolIds) {
      if (allowedSchoolIds.length === 0) return [];
      conditions.push(inArray(subscriptions.school_id, allowedSchoolIds));
    }
    if (filters.school_id) conditions.push(eq(subscriptions.school_id, filters.school_id));
    if (filters.status)
      conditions.push(eq(subscriptions.status, filters.status as Subscription['status']));

    const limit = filters.limit ?? 20;
    const offset = ((filters.page ?? 1) - 1) * limit;

    return this.db
      .select()
      .from(subscriptions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(limit)
      .offset(offset);
  }

  async count(filters: SubscriptionFilterDto, allowedSchoolIds?: string[]): Promise<number> {
    const conditions = [];
    if (allowedSchoolIds) {
      if (allowedSchoolIds.length === 0) return 0;
      conditions.push(inArray(subscriptions.school_id, allowedSchoolIds));
    }
    if (filters.school_id) conditions.push(eq(subscriptions.school_id, filters.school_id));
    if (filters.status)
      conditions.push(eq(subscriptions.status, filters.status as Subscription['status']));

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(subscriptions)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    return Number(count);
  }

  async findById(id: string): Promise<Subscription | undefined> {
    const [row] = await this.db.select().from(subscriptions).where(eq(subscriptions.id, id));
    return row;
  }

  async findActiveBySchoolId(schoolId: string): Promise<Subscription | undefined> {
    const [row] = await this.db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.school_id, schoolId), eq(subscriptions.status, 'ACTIVE')))
      .limit(1);
    return row;
  }

  async create(data: NewSubscription): Promise<Subscription> {
    const [row] = await this.db.insert(subscriptions).values(data).returning();
    return row;
  }

  async update(id: string, data: Partial<NewSubscription>): Promise<Subscription> {
    const [row] = await this.db
      .update(subscriptions)
      .set({ ...data, updated_at: new Date() })
      .where(eq(subscriptions.id, id))
      .returning();
    return row;
  }

  async findPayments(subscriptionId: string): Promise<SubscriptionPayment[]> {
    return this.db
      .select()
      .from(subscriptionPayments)
      .where(eq(subscriptionPayments.subscription_id, subscriptionId))
      .orderBy(subscriptionPayments.created_at);
  }

  async findPaymentById(id: string): Promise<SubscriptionPayment | undefined> {
    const [row] = await this.db
      .select()
      .from(subscriptionPayments)
      .where(eq(subscriptionPayments.id, id));
    return row;
  }

  async createPayment(data: NewSubscriptionPayment): Promise<SubscriptionPayment> {
    const [row] = await this.db.insert(subscriptionPayments).values(data).returning();
    return row;
  }

  async updatePayment(
    id: string,
    data: Partial<NewSubscriptionPayment>,
  ): Promise<SubscriptionPayment> {
    const [row] = await this.db
      .update(subscriptionPayments)
      .set({ ...data, updated_at: new Date() })
      .where(eq(subscriptionPayments.id, id))
      .returning();
    return row;
  }

  async findSchoolIdsByCompanyUserId(userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ school_id: companyUserSchools.school_id })
      .from(companyUserSchools)
      .where(eq(companyUserSchools.user_id, userId));
    return rows.map((r) => r.school_id);
  }
}
