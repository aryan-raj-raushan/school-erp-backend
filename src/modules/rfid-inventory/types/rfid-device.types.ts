import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { rfidDevices } from '../../../database/drizzle/schema/rfid-devices.schema';

export type RfidDevice = InferSelectModel<typeof rfidDevices>;
export type NewRfidDevice = InferInsertModel<typeof rfidDevices>;
