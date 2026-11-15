import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RfidInventoryRepository } from './rfid-inventory.repository';
import { generateId } from '../../utils/uuid.utils';
import { PaginationResponse } from '../../shared/responses/api-response';
import { CreateRfidDeviceDto } from './dto/create-rfid-device.dto';
import { UpdateRfidDeviceDto } from './dto/update-rfid-device.dto';
import { AssignRfidDeviceDto } from './dto/assign-rfid-device.dto';
import { RfidDeviceFilterDto } from './dto/rfid-device-filter.dto';
import { MapRfidDeviceDto } from './dto/map-rfid-device.dto';
import { RfidDevice, DiscoveredRfidDevice } from './types/rfid-device.types';
import { RfidDeviceStatus } from '../../shared/enums';
import { APP_EVENTS } from '../../shared/events/event-names';
import { RfidDeviceAssignedEvent } from './events/rfid-inventory.events';

const DISCOVERY_WINDOW_DAYS = 30;
const DISCOVERY_LIMIT = 100;

@Injectable()
export class RfidInventoryService {
  constructor(
    private readonly rfidInventoryRepo: RfidInventoryRepository,
    private readonly events: EventEmitter2,
  ) {}

  async findAll(filters: RfidDeviceFilterDto): Promise<PaginationResponse<RfidDevice>> {
    const [items, total] = await Promise.all([
      this.rfidInventoryRepo.findAll(filters),
      this.rfidInventoryRepo.count(filters),
    ]);
    return PaginationResponse.of(items, total, filters);
  }

  async findById(id: string): Promise<RfidDevice> {
    const device = await this.rfidInventoryRepo.findById(id);
    if (!device) throw new NotFoundException(`RFID device '${id}' not found`);
    return device;
  }

  async findDiscovered(): Promise<DiscoveredRfidDevice[]> {
    const since = new Date(Date.now() - DISCOVERY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    return this.rfidInventoryRepo.findDiscovered(since, DISCOVERY_LIMIT);
  }

  private static assertValidDates(purchaseDate?: string | null, warrantyExpiry?: string | null) {
    const today = new Date().toISOString().slice(0, 10);
    if (purchaseDate && purchaseDate.slice(0, 10) > today) {
      throw new BadRequestException('purchase_date cannot be in the future');
    }
    if (purchaseDate && warrantyExpiry && warrantyExpiry.slice(0, 10) < purchaseDate.slice(0, 10)) {
      throw new BadRequestException('warranty_expiry cannot be before purchase_date');
    }
  }

  private async assertIdentifierAvailable(identifier: string, excludeId?: string) {
    const existing = await this.rfidInventoryRepo.findByIdentifier(identifier);
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`Device '${existing.device_identifier}' already exists`);
    }
  }

  async create(dto: CreateRfidDeviceDto, createdBy: string): Promise<RfidDevice> {
    await this.assertIdentifierAvailable(dto.device_identifier);
    RfidInventoryService.assertValidDates(dto.purchase_date, dto.warranty_expiry);

    return this.rfidInventoryRepo.create({
      id: generateId(),
      created_by: createdBy,
      device_identifier: dto.device_identifier,
      device_model: dto.device_model,
      purchase_date: dto.purchase_date,
      warranty_expiry: dto.warranty_expiry,
      notes: dto.notes,
    });
  }

  async update(id: string, dto: UpdateRfidDeviceDto): Promise<RfidDevice> {
    const device = await this.findById(id);
    if (dto.device_identifier) await this.assertIdentifierAvailable(dto.device_identifier, id);
    RfidInventoryService.assertValidDates(
      dto.purchase_date ?? device.purchase_date,
      dto.warranty_expiry ?? device.warranty_expiry,
    );
    return this.rfidInventoryRepo.update(id, dto);
  }

  async remove(id: string): Promise<void> {
    const device = await this.findById(id);
    if (
      device.status !== RfidDeviceStatus.IN_STOCK &&
      device.status !== RfidDeviceStatus.RETURNED
    ) {
      throw new BadRequestException(
        `Only IN_STOCK or RETURNED devices can be deleted (currently '${device.status}') — return it first`,
      );
    }
    await this.rfidInventoryRepo.delete(id);
  }

  private async assertAssignment(dto: AssignRfidDeviceDto) {
    if (!(await this.rfidInventoryRepo.isActiveSchool(dto.school_id))) {
      throw new BadRequestException('Devices can only be assigned to an active school');
    }
    if (dto.billable && dto.charge_amount == null) {
      throw new BadRequestException('charge_amount is required when billable = true');
    }
  }

  async map(dto: MapRfidDeviceDto, createdBy: string): Promise<RfidDevice> {
    const existing = await this.rfidInventoryRepo.findByIdentifier(dto.device_identifier);
    if (existing) return this.assign(existing.id, dto, createdBy);

    await this.assertAssignment(dto);
    const device = await this.rfidInventoryRepo.create({
      id: generateId(),
      created_by: createdBy,
      device_identifier: dto.device_identifier,
      device_model: dto.device_model,
    });
    return this.assign(device.id, dto, createdBy);
  }

  async assign(id: string, dto: AssignRfidDeviceDto, createdBy: string): Promise<RfidDevice> {
    const device = await this.findById(id);
    if (
      device.status !== RfidDeviceStatus.IN_STOCK &&
      device.status !== RfidDeviceStatus.RETURNED
    ) {
      throw new BadRequestException(`Device is '${device.status}' and cannot be assigned`);
    }
    await this.assertAssignment(dto);

    const updated = await this.rfidInventoryRepo.update(id, {
      assigned_school_id: dto.school_id,
      status: RfidDeviceStatus.ASSIGNED,
    });

    // Billing (an optional one-time charge) is a different domain — decoupled
    // via event rather than this module calling into the invoices module directly.
    this.events.emit(APP_EVENTS.RFID_INVENTORY.DEVICE_ASSIGNED, {
      deviceId: updated.id,
      deviceIdentifier: updated.device_identifier,
      schoolId: dto.school_id,
      billable: !!dto.billable,
      chargeType: dto.charge_type,
      chargeAmount: dto.charge_amount,
      createdBy,
    } satisfies RfidDeviceAssignedEvent);

    return updated;
  }

  async install(id: string, installationDate?: string): Promise<RfidDevice> {
    const device = await this.findById(id);
    if (device.status !== RfidDeviceStatus.ASSIGNED) {
      throw new BadRequestException(
        `Device must be ASSIGNED before it can be installed (currently '${device.status}')`,
      );
    }
    return this.rfidInventoryRepo.update(id, {
      status: RfidDeviceStatus.INSTALLED,
      installation_date: installationDate ?? new Date().toISOString().slice(0, 10),
    });
  }

  async returnDevice(id: string): Promise<RfidDevice> {
    const device = await this.findById(id);
    if (
      device.status !== RfidDeviceStatus.ASSIGNED &&
      device.status !== RfidDeviceStatus.INSTALLED
    ) {
      throw new BadRequestException(
        `Only ASSIGNED or INSTALLED devices can be returned (currently '${device.status}')`,
      );
    }
    return this.rfidInventoryRepo.update(id, {
      status: RfidDeviceStatus.RETURNED,
      assigned_school_id: null,
    });
  }
}
