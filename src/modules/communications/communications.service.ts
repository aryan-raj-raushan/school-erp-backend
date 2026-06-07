import { Injectable, NotFoundException } from '@nestjs/common';
import { CommunicationsRepository } from './communications.repository';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { SendNotificationDto, SendCommunicationDto, ReviewCommunicationDto } from './dto/communication.dto';
import { Notification, Communication } from './types/communication.types';

const CACHE_TTL = 120;

@Injectable()
export class CommunicationsService {
  constructor(
    private readonly repo: CommunicationsRepository,
    private readonly redisService: RedisService,
  ) {}

  private notifKey(schoolId: string) { return `notifications:${schoolId}`; }
  private commKey(schoolId: string) { return `communications:${schoolId}`; }

  // ─── Notifications ──────────────────────────────────────────────────────────

  async sendNotification(dto: SendNotificationDto, schoolId: string, senderId: string): Promise<Notification> {
    const notif = await this.repo.createNotification({
      id: generateId(), school_id: schoolId, sender_id: senderId,
      title: dto.title, message: dto.message,
      recipient_id: dto.recipient_id, recipient_role: dto.recipient_role,
    });
    await this.redisService.delByPattern(`${this.notifKey(schoolId)}:*`);
    return notif;
  }

  async getNotificationsForUser(userId: string, schoolId: string): Promise<Notification[]> {
    const key = `${this.notifKey(schoolId)}:user:${userId}`;
    return this.redisService.getOrSet(key, CACHE_TTL, () => this.repo.findNotificationsForUser(userId, schoolId));
  }

  async getSentByUser(senderId: string, schoolId: string): Promise<Notification[]> {
    const key = `${this.notifKey(schoolId)}:sent:${senderId}`;
    return this.redisService.getOrSet(key, CACHE_TTL, () => this.repo.findSentByUser(senderId, schoolId));
  }

  async markAllRead(userId: string, schoolId: string): Promise<void> {
    await this.repo.markAllRead(userId, schoolId);
    await this.redisService.delByPattern(`${this.notifKey(schoolId)}:*`);
  }

  async getNotificationById(id: string, schoolId: string): Promise<Notification> {
    const notif = await this.repo.findNotificationById(id, schoolId);
    if (!notif) throw new NotFoundException(`Notification with id '${id}' not found`);
    await this.repo.markRead(id);
    // bust user list cache so is_read reflects immediately
    await this.redisService.delByPattern(`${this.notifKey(schoolId)}:*`);
    return { ...notif, is_read: true };
  }

  async deleteNotification(id: string, schoolId: string): Promise<void> {
    const notif = await this.repo.findNotificationById(id, schoolId);
    if (!notif) throw new NotFoundException(`Notification with id '${id}' not found`);
    await this.repo.softDeleteNotification(id, schoolId);
    await this.redisService.delByPattern(`${this.notifKey(schoolId)}:*`);
  }

  async markNotificationRead(id: string, schoolId: string): Promise<Notification> {
    const notif = await this.repo.findNotificationById(id, schoolId);
    if (!notif) throw new NotFoundException(`Notification with id '${id}' not found`);
    await this.repo.markRead(id);
    await this.redisService.delByPattern(`${this.notifKey(schoolId)}:*`);
    return { ...notif, is_read: true };
  }

  // ─── Communications ──────────────────────────────────────────────────────────

  async sendCommunication(dto: SendCommunicationDto, schoolId: string, senderId: string): Promise<Communication> {
    const comm = await this.repo.createCommunication({
      id: generateId(), school_id: schoolId, sender_id: senderId,
      recipient_id: dto.recipient_id, type: dto.type as any,
      subject: dto.subject, message: dto.message,
    });
    await this.redisService.delByPattern(`${this.commKey(schoolId)}:*`);
    return comm;
  }

  async getCommunications(schoolId: string, userId: string, view: 'sent' | 'received' | 'all' = 'all'): Promise<Communication[]> {
    const key = `${this.commKey(schoolId)}:user:${userId}:${view}`;
    return this.redisService.getOrSet(key, CACHE_TTL, () => this.repo.findCommunications(schoolId, userId, view));
  }

  async getPendingSummary(userId: string, schoolId: string): Promise<{ count: number }> {
    const key = `${this.commKey(schoolId)}:pending:${userId}`;
    return this.redisService.getOrSet(key, CACHE_TTL, async () => {
      const count = await this.repo.countPending(userId, schoolId);
      return { count };
    });
  }

  async getCommunicationById(id: string, schoolId: string): Promise<Communication> {
    const comm = await this.repo.findCommunicationById(id, schoolId);
    if (!comm) throw new NotFoundException(`Communication with id '${id}' not found`);
    await this.repo.markCommRead(id);
    await this.redisService.delByPattern(`${this.commKey(schoolId)}:*`);
    return comm;
  }

  async reviewCommunication(id: string, schoolId: string, reviewerId: string, dto: ReviewCommunicationDto): Promise<Communication> {
    const comm = await this.repo.findCommunicationById(id, schoolId);
    if (!comm) throw new NotFoundException(`Communication with id '${id}' not found`);
    const updated = await this.repo.reviewCommunication(id, schoolId, {
      status: dto.status as any,
      reply: dto.reply,
      reviewed_by: reviewerId,
      replied_at: dto.reply ? new Date() : undefined,
    });
    await this.redisService.delByPattern(`${this.commKey(schoolId)}:*`);
    return updated;
  }
}
