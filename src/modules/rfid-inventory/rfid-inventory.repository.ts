import { Injectable, Inject } from '@nestjs/common';
import { eq, and, ilike, sql, ne, gte, or, isNull, inArray, desc } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { rfidDevices, rfidScanEvents, schools } from '../../database/drizzle/schema';
import { RfidDeviceFilterDto } from './dto/rfid-device-filter.dto';
import { RfidDevice, NewRfidDevice, DiscoveredRfidDevice } from './types/rfid-device.types';
import { RfidDeviceStatus } from '../../shared/enums';

@Injectable()
export class RfidInventoryRepository {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDB) {}

  private buildConditions(filters: RfidDeviceFilterDto) {
    const conditions = [];
    if (filters.search)
      conditions.push(ilike(rfidDevices.device_identifier, `%${filters.search}%`));
    if (filters.status) conditions.push(eq(rfidDevices.status, filters.status));
    if (filters.school_id) conditions.push(eq(rfidDevices.assigned_school_id, filters.school_id));
    return conditions;
  }

  async findAll(filters: RfidDeviceFilterDto): Promise<RfidDevice[]> {
    const conditions = this.buildConditions(filters);
    const limit = filters.limit ?? 20;
    const offset = ((filters.page ?? 1) - 1) * limit;
    return this.db
      .select()
      .from(rfidDevices)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(rfidDevices.created_at)
      .limit(limit)
      .offset(offset);
  }

  async count(filters: RfidDeviceFilterDto): Promise<number> {
    const conditions = this.buildConditions(filters);
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(rfidDevices)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    return Number(count);
  }

  async findById(id: string): Promise<RfidDevice | undefined> {
    const [row] = await this.db.select().from(rfidDevices).where(eq(rfidDevices.id, id));
    return row;
  }

  async findByIdentifier(deviceIdentifier: string): Promise<RfidDevice | undefined> {
    const [row] = await this.db
      .select()
      .from(rfidDevices)
      .where(sql`upper(${rfidDevices.device_identifier}) = upper(${deviceIdentifier})`);
    return row;
  }

  async findDiscovered(since: Date, limit: number): Promise<DiscoveredRfidDevice[]> {
    const lastSeen = sql<string>`max(${rfidScanEvents.received_at})`;
    return this.db
      .select({
        device_identifier: rfidScanEvents.device_id,
        tap_count: sql<number>`count(*)::int`,
        last_seen_at: lastSeen,
        last_card: sql<string>`(array_agg(${rfidScanEvents.rfid_card_id} order by ${rfidScanEvents.received_at} desc))[1]`,
        inventory_id: rfidDevices.id,
        status: rfidDevices.status,
      })
      .from(rfidScanEvents)
      .leftJoin(
        rfidDevices,
        sql`upper(${rfidDevices.device_identifier}) = upper(${rfidScanEvents.device_id})`,
      )
      .where(
        and(
          ne(rfidScanEvents.device_id, ''),
          gte(rfidScanEvents.received_at, since),
          or(
            isNull(rfidDevices.id),
            inArray(rfidDevices.status, [RfidDeviceStatus.IN_STOCK, RfidDeviceStatus.RETURNED]),
          ),
        ),
      )
      .groupBy(rfidScanEvents.device_id, rfidDevices.id, rfidDevices.status)
      .orderBy(desc(lastSeen))
      .limit(limit);
  }

  async isActiveSchool(schoolId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: schools.id })
      .from(schools)
      .where(
        and(eq(schools.id, schoolId), eq(schools.is_active, true), eq(schools.deleted, false)),
      );
    return !!row;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(rfidDevices).where(eq(rfidDevices.id, id));
  }

  async create(data: NewRfidDevice): Promise<RfidDevice> {
    const [row] = await this.db.insert(rfidDevices).values(data).returning();
    return row;
  }

  async update(id: string, data: Partial<NewRfidDevice>): Promise<RfidDevice> {
    const [row] = await this.db
      .update(rfidDevices)
      .set({ ...data, updated_at: new Date() })
      .where(eq(rfidDevices.id, id))
      .returning();
    return row;
  }
}
