import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RfidRepository } from './rfid.repository';

export type RfidScanEvent = {
  r: string;
  d: string;
  t1: number;
  receivedAt: string;
};

type EdzonRecord = {
  r?: string;
  rfid?: string;
  d?: string;
  device?: string;
  t1: number | string;
  creationDate?: string;
};

const EDZON_API = 'https://8pk8o4ol35.execute-api.ap-south-1.amazonaws.com/beta/iot-device-lambda';
const DEVICE_ID = process.env.RFID_DEVICE_ID ?? '';
const POLL_MS = 5_000;
const MAX_EVENTS = 100;

@Injectable()
export class RfidService implements OnModuleInit {
  private readonly logger = new Logger(RfidService.name);
  private readonly recentEvents: RfidScanEvent[] = [];
  private readonly seenKeys = new Set<string>();

  constructor(private readonly rfidRepository: RfidRepository) {}

  onModuleInit() {
    if (!DEVICE_ID) {
      this.logger.warn('RFID_DEVICE_ID not set — Edzon Lambda polling disabled');
      return;
    }
    this.pollEdzon();
  }

  private pollEdzon() {
    setTimeout(async () => {
      try {
        const res = await fetch(`${EDZON_API}?deviceId=${DEVICE_ID}`);
        if (res.ok) {
          const records: EdzonRecord[] = await res.json();
          const getRfid = (r: EdzonRecord) => r.r ?? r.rfid ?? '';
          const fresh = records.filter((r) => {
            const key = `${getRfid(r)}-${r.t1}`;
            return getRfid(r) && !this.seenKeys.has(key);
          });
          for (const r of fresh) {
            await this.push(r, 'edzon_poll');
          }
          if (fresh.length) this.logger.debug(`Edzon poll: ${fresh.length} new record(s)`);
        }
      } catch (err) {
        this.logger.debug(`Edzon poll failed: ${err}`);
      } finally {
        this.pollEdzon();
      }
    }, POLL_MS);
  }

  async handleScans(ses: EdzonRecord[]): Promise<void> {
    for (const r of ses) {
      await this.push(r, 'webhook');
    }
  }

  getEvents(): RfidScanEvent[] {
    return this.recentEvents;
  }

  private async push(r: EdzonRecord, source: 'webhook' | 'edzon_poll') {
    const rfid = r.r ?? r.rfid ?? '';
    const key = `${rfid}-${r.t1}`;
    if (!rfid || this.seenKeys.has(key)) return;
    this.seenKeys.add(key);

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
        source,
        received_at: new Date(receivedAt),
      });
    } catch (err) {
      this.logger.error(`Failed to persist RFID event: ${err}`);
    }
  }
}
