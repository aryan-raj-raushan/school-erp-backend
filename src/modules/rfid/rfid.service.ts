import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

export type RfidScanEvent = {
  r: string;
  d: string;
  t1: number;
  receivedAt: string;
};

type EdzonRecord = { r: string; d: string; t1: number };

const EDZON_API = 'https://8pk8o4ol35.execute-api.ap-south-1.amazonaws.com/beta/iot-device-lambda';
const DEVICE_ID = process.env.RFID_DEVICE_ID ?? '';
const POLL_MS = 5_000;

@Injectable()
export class RfidService implements OnModuleInit {
  private readonly logger = new Logger(RfidService.name);
  private readonly scanSubject = new Subject<RfidScanEvent>();
  private lastSeenT1 = 0;

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
          const fresh = records.filter((r) => r.t1 > this.lastSeenT1);
          if (fresh.length) {
            this.lastSeenT1 = Math.max(...fresh.map((r) => r.t1));
            fresh.forEach((r) => this.emit(r));
          }
        }
      } catch (err) {
        this.logger.debug(`Edzon poll failed: ${err}`);
      } finally {
        this.pollEdzon();
      }
    }, POLL_MS);
  }

  handleScans(ses: EdzonRecord[]): void {
    ses.forEach((r) => this.emit(r));
  }

  private emit(r: EdzonRecord) {
    this.scanSubject.next({ ...r, receivedAt: new Date().toISOString() });
  }

  getEvents(): Observable<MessageEvent> {
    return new Observable((observer) => {
      const sub = this.scanSubject.subscribe((scan) => {
        observer.next({ data: scan } as MessageEvent);
      });
      return () => sub.unsubscribe();
    });
  }
}
