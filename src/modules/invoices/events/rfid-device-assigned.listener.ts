import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InvoicesService } from '../invoices.service';
import { APP_EVENTS } from '../../../shared/events/event-names';
import { RfidDeviceAssignedEvent } from '../../rfid-inventory/events/rfid-inventory.events';
import { OneTimeChargeType, CompanyRole } from '../../../shared/enums';

@Injectable()
export class RfidDeviceAssignedListener {
  private readonly logger = new Logger(RfidDeviceAssignedListener.name);

  constructor(private readonly invoicesService: InvoicesService) {}

  // Optional billing side effect of an RFID inventory assignment — kept out
  // of the rfid-inventory module entirely so it stays unaware of billing.
  @OnEvent(APP_EVENTS.RFID_INVENTORY.DEVICE_ASSIGNED)
  async handleDeviceAssigned(payload: RfidDeviceAssignedEvent): Promise<void> {
    if (!payload.billable || payload.chargeAmount == null) return;
    try {
      await this.invoicesService.createOneTimeCharge(
        {
          school_id: payload.schoolId,
          charge_type: payload.chargeType ?? OneTimeChargeType.RFID_DEVICE,
          description: `RFID device assignment (${payload.deviceIdentifier})`,
          amount: payload.chargeAmount,
        },
        payload.createdBy ?? 'system',
        // RFID device assignment is already SUPER_ADMIN/OPERATOR-only at the
        // controller level, both unrestricted — no further scoping needed here.
        CompanyRole.SUPER_ADMIN,
      );
    } catch (error) {
      this.logger.error(
        `Failed to bill RFID device assignment for school ${payload.schoolId}`,
        error,
      );
    }
  }
}
