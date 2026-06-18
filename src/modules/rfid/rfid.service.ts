import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RfidRepository } from './rfid.repository';

export type RfidScanEvent = {
  r: string;
  d: string;
  t1: number;
  receivedAt: string;
};

type RfidRecord = { r?: string; rfid?: string; d?: string; device?: string; t1: number | string };

const MAX_EVENTS = 100;

@Injectable()
export class RfidService {
  private readonly logger = new Logger(RfidService.name);
  private readonly recentEvents: RfidScanEvent[] = [];

  constructor(private readonly rfidRepository: RfidRepository) {}

  async handleScans(ses: RfidRecord[]): Promise<void> {
    for (const r of ses) {
      await this.push(r);
    }
  }

  getEvents(): RfidScanEvent[] {
    return this.recentEvents;
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
    } catch (err) {
      this.logger.error(`Failed to persist RFID event: ${err}`);
    }
  }
}
