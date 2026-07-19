import { OneTimeChargeType } from '../../../shared/enums';

export interface RfidDeviceAssignedEvent {
  deviceId: string;
  deviceIdentifier: string;
  schoolId: string;
  billable: boolean;
  chargeType?: OneTimeChargeType;
  chargeAmount?: number;
  createdBy?: string;
}
