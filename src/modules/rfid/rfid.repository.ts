import { Injectable, Inject } from '@nestjs/common';
import { desc } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import {
  rfidScanEvents,
  NewRfidScanEventRow,
  RfidScanEventRow,
} from '../../database/drizzle/schema/rfid-scan-events.schema';

@Injectable()
export class RfidRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  async insert(data: NewRfidScanEventRow): Promise<void> {
    await this.db.insert(rfidScanEvents).values(data).onConflictDoNothing();
  }

  async findRecent(limit = 100): Promise<RfidScanEventRow[]> {
    return this.db
      .select()
      .from(rfidScanEvents)
      .orderBy(desc(rfidScanEvents.received_at))
      .limit(limit);
  }
}
