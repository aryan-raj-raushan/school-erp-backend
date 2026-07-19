import { Injectable, Inject } from '@nestjs/common';
import { eq, and, ilike, sql } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { rfidDevices } from '../../database/drizzle/schema';
import { RfidDeviceFilterDto } from './dto/rfid-device-filter.dto';
import { RfidDevice, NewRfidDevice } from './types/rfid-device.types';

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
      .where(eq(rfidDevices.device_identifier, deviceIdentifier));
    return row;
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
