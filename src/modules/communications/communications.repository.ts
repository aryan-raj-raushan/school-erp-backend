import { Injectable, Inject } from '@nestjs/common';
import { eq, and, or, sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { notifications, communications } from '../../database/drizzle/schema/communications.schema';
import { Notification, NewNotification, Communication, NewCommunication } from './types/communication.types';

@Injectable()
export class CommunicationsRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  // Notifications
  async createNotification(data: NewNotification): Promise<Notification> {
    const [row] = await this.db.insert(notifications).values(data).returning();
    return row;
  }

  async findNotificationsForUser(
    userId: string,
    schoolId: string,
    callerRole: string,
  ): Promise<Notification[]> {
    return this.db.select().from(notifications).where(
      and(
        eq(notifications.school_id, schoolId),
        eq(notifications.deleted, false),
        or(eq(notifications.recipient_id, userId), eq(notifications.recipient_role, callerRole)),
      ),
    ).orderBy(notifications.created_at);
  }

  async findSentByUser(senderId: string, schoolId: string): Promise<Notification[]> {
    return this.db.select().from(notifications).where(
      and(eq(notifications.sender_id, senderId), eq(notifications.school_id, schoolId), eq(notifications.deleted, false)),
    ).orderBy(notifications.created_at);
  }

  async findNotificationById(id: string, schoolId: string): Promise<Notification | undefined> {
    const [row] = await this.db.select().from(notifications).where(
      and(eq(notifications.id, id), eq(notifications.school_id, schoolId), eq(notifications.deleted, false)),
    );
    return row;
  }

  async markRead(id: string): Promise<void> {
    await this.db.update(notifications).set({ is_read: true, read_at: new Date(), updated_at: new Date() }).where(eq(notifications.id, id));
  }

  async markAllRead(userId: string, schoolId: string): Promise<void> {
    await this.db.update(notifications).set({ is_read: true, read_at: new Date(), updated_at: new Date() })
      .where(and(eq(notifications.recipient_id, userId), eq(notifications.school_id, schoolId), eq(notifications.is_read, false)));
  }

  async softDeleteNotification(id: string, schoolId: string): Promise<void> {
    await this.db.update(notifications).set({ deleted: true, updated_at: new Date() }).where(and(eq(notifications.id, id), eq(notifications.school_id, schoolId)));
  }

  // Communications
  async createCommunication(data: NewCommunication): Promise<Communication> {
    const [row] = await this.db.insert(communications).values(data).returning();
    return row;
  }

  async findCommunications(schoolId: string, userId: string, view: 'sent' | 'received' | 'all'): Promise<Communication[]> {
    const conditions = [eq(communications.school_id, schoolId), eq(communications.deleted, false)];
    if (view === 'sent') conditions.push(eq(communications.sender_id, userId));
    else if (view === 'received') conditions.push(eq(communications.recipient_id, userId));
    else conditions.push(or(eq(communications.sender_id, userId), eq(communications.recipient_id, userId))!);
    return this.db.select().from(communications).where(and(...conditions)).orderBy(communications.created_at);
  }

  async countPending(recipientId: string, schoolId: string): Promise<number> {
    const [{ count }] = await this.db.select({ count: sql<number>`count(*)` }).from(communications)
      .where(and(eq(communications.recipient_id, recipientId), eq(communications.school_id, schoolId), eq(communications.status, 'PENDING'), eq(communications.deleted, false)));
    return Number(count);
  }

  async findCommunicationById(id: string, schoolId: string): Promise<Communication | undefined> {
    const [row] = await this.db.select().from(communications).where(and(eq(communications.id, id), eq(communications.school_id, schoolId), eq(communications.deleted, false)));
    return row;
  }

  async reviewCommunication(id: string, schoolId: string, data: Partial<NewCommunication>): Promise<Communication> {
    const [row] = await this.db.update(communications).set({ ...data, updated_at: new Date() }).where(and(eq(communications.id, id), eq(communications.school_id, schoolId))).returning();
    return row;
  }

  async markCommRead(id: string): Promise<void> {
    await this.db.update(communications).set({ is_read: true, read_at: new Date(), updated_at: new Date() }).where(eq(communications.id, id));
  }
}
