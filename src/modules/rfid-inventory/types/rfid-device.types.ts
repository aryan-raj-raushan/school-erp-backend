import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { rfidDevices } from '../../../database/drizzle/schema/rfid-devices.schema';

export type RfidDevice = InferSelectModel<typeof rfidDevices>;
export type NewRfidDevice = InferInsertModel<typeof rfidDevices>;

export type DiscoveredRfidDevice = {
  device_identifier: string;
  tap_count: number;
  last_seen_at: string;
  last_card: string;
  inventory_id: string | null;
  status: RfidDevice['status'] | null;
};
