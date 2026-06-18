import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RedisService } from '../redis/redis.service';
import { CacheTTL } from '../../shared/constants';
import { RfidRepository, PersonRow } from './rfid.repository';

export type RfidScanEvent = {
  r: string;
  d: string;
  t1: number;
  receivedAt: string;
};

export type EnrichedRfidEvent = RfidScanEvent & {
  personName: string | null;
  personType: 'staff' | 'student' | null;
  personId: string | null;
};

export type PersonResult = PersonRow;

type RfidRecord = { r?: string; rfid?: string; d?: string; device?: string; t1: number | string };

const MAX_EVENTS = 100;

@Injectable()
export class RfidService {
  private readonly logger = new Logger(RfidService.name);
  private readonly recentEvents: RfidScanEvent[] = [];

  constructor(
    private readonly rfidRepository: RfidRepository,
    private readonly redisService: RedisService,
  ) {}

  private cacheKey(schoolId: string) {
    return `rfid:${schoolId}`;
  }

  async handleScans(ses: RfidRecord[]): Promise<void> {
    for (const r of ses) {
      await this.push(r);
    }
  }

  async getEnrichedEvents(schoolId: string): Promise<EnrichedRfidEvent[]> {
    const key = `${this.cacheKey(schoolId)}:persons`;
    const persons = await this.redisService.getOrSet(key, CacheTTL.SHORT, () =>
      this.rfidRepository.getAllPersonsWithRfid(schoolId),
    );

    const rfidMap = new Map(persons.map((p) => [p.rfid, p]));

    return this.recentEvents.map((e) => {
      const person = rfidMap.get(e.r) ?? null;
      return {
        ...e,
        personName: person?.name ?? null,
        personType: person?.type ?? null,
        personId: person?.id ?? null,
      };
    });
  }

  async searchPersons(
    q: string,
    type: 'staff' | 'student' | 'all',
    schoolId: string,
  ): Promise<PersonResult[]> {
    const key = `${this.cacheKey(schoolId)}:search:${type}:${q}`;
    return this.redisService.getOrSet(key, CacheTTL.SHORT, () =>
      this.rfidRepository.searchPersons(q, type, schoolId),
    );
  }

  async assignCard(
    rfidCardId: string,
    personType: 'staff' | 'student',
    personId: string,
    schoolId: string,
  ): Promise<void> {
    if (personType === 'staff') {
      await this.rfidRepository.assignToStaff(rfidCardId, personId, schoolId);
      await this.redisService.delByPattern(`staff:${schoolId}:*`);
    } else {
      await this.rfidRepository.assignToStudent(rfidCardId, personId, schoolId);
      await this.redisService.delByPattern(`students:${schoolId}:*`);
    }
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
  }

  async unassignCard(
    personType: 'staff' | 'student',
    personId: string,
    schoolId: string,
  ): Promise<void> {
    if (personType === 'staff') {
      await this.rfidRepository.unassignFromStaff(personId, schoolId);
      await this.redisService.delByPattern(`staff:${schoolId}:*`);
    } else {
      await this.rfidRepository.unassignFromStudent(personId, schoolId);
      await this.redisService.delByPattern(`students:${schoolId}:*`);
    }
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
  }

  private async push(r: RfidRecord) {
    const rfid = r.r ?? r.rfid ?? '';
    if (!rfid) return;

    const t1 = typeof r.t1 === 'number' ? r.t1 : new Date(r.t1).getTime();
    const receivedAt = new Date().toISOString();

    const event: RfidScanEvent = { r: rfid, d: r.d ?? r.device ?? '', t1, receivedAt };
    this.recentEvents.unshift(event);
    if (this.recentEvents.length > MAX_EVENTS) this.recentEvents.length = MAX_EVENTS;

    try {
      await this.rfidRepository.insert({
        id: randomUUID(),
        rfid_card_id: rfid,
        device_id: r.d ?? r.device ?? '',
        t1,
        source: 'webhook',
        received_at: new Date(receivedAt),
      });

      const student = await this.rfidRepository.findStudentByRfid(rfid);
      if (student) {
        await this.rfidRepository.autoMarkStudentAttendance(
          student.id,
          student.school_id,
          new Date(t1 || Date.now()),
        );
        await this.redisService.delByPattern(`attendance:${student.school_id}:*`);
        this.logger.log(`Auto-marked attendance for student ${student.id} via RFID`);
      }
    } catch (err) {
      this.logger.error(`Failed to persist RFID event: ${err}`);
    }
  }
}
