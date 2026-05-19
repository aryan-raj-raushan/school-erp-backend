import { Injectable, Inject } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { subscriptions, subscriptionPayments } from '../../database/drizzle/schema';
import { Subscription, NewSubscription, SubscriptionPayment, NewSubscriptionPayment } from './types/subscription.types';
import { SubscriptionFilterDto } from './dto/subscription-filter.dto';

@Injectable()
export class SubscriptionsRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  async findAll(filters: SubscriptionFilterDto): Promise<Subscription[]> {
    const conditions = [];
    if (filters.school_id) conditions.push(eq(subscriptions.school_id, filters.school_id));
    if (filters.status) conditions.push(eq(subscriptions.status, filters.status as Subscription['status']));

    const limit = filters.limit ?? 20;
    const offset = ((filters.page ?? 1) - 1) * limit;

    const query = this.db.select().from(subscriptions);
    if (conditions.length > 0) query.where(and(...conditions));
    return query.limit(limit).offset(offset);
  }

  async count(filters: SubscriptionFilterDto): Promise<number> {
    const conditions = [];
    if (filters.school_id) conditions.push(eq(subscriptions.school_id, filters.school_id));
    if (filters.status) conditions.push(eq(subscriptions.status, filters.status as Subscription['status']));

    const query = this.db.select({ count: sql<number>`count(*)` }).from(subscriptions);
    if (conditions.length > 0) query.where(and(...conditions));
    const [{ count }] = await query;
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

  async updatePayment(id: string, data: Partial<NewSubscriptionPayment>): Promise<SubscriptionPayment> {
    const [row] = await this.db
      .update(subscriptionPayments)
      .set({ ...data, updated_at: new Date() })
      .where(eq(subscriptionPayments.id, id))
      .returning();
    return row;
  }
}
