import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

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
          const rfid = (r: EdzonRecord) => r.r ?? r.rfid ?? '';
          const fresh = records.filter((r) => {
            const key = `${rfid(r)}-${r.t1}`;
            return rfid(r) && !this.seenKeys.has(key);
          });
          fresh.forEach((r) => this.push(r));
          this.logger.debug(`Edzon poll: ${records.length} total, ${fresh.length} new`);
        }
      } catch (err) {
        this.logger.debug(`Edzon poll failed: ${err}`);
      } finally {
        this.pollEdzon();
      }
    }, POLL_MS);
  }

  handleScans(ses: EdzonRecord[]): void {
    ses.forEach((r) => this.push(r));
  }

  getEvents(): RfidScanEvent[] {
    return this.recentEvents;
  }

  private push(r: EdzonRecord) {
    const rfid = r.r ?? r.rfid ?? '';
    const key = `${rfid}-${r.t1}`;
    if (!rfid || this.seenKeys.has(key)) return;
    this.seenKeys.add(key);
    const event: RfidScanEvent = {
      r: rfid,
      d: r.d ?? r.device ?? '',
      t1: typeof r.t1 === 'number' ? r.t1 : new Date(r.t1).getTime(),
      receivedAt: new Date().toISOString(),
    };
    this.recentEvents.unshift(event);
    if (this.recentEvents.length > MAX_EVENTS) this.recentEvents.length = MAX_EVENTS;
  }
}
