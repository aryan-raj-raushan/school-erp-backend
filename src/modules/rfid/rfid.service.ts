import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RedisService } from '../redis/redis.service';
import { CacheTTL } from '../../shared/constants';
import { RfidDeviceStatus } from '../../shared/enums';
import { RfidRepository, PersonRow, CardOwner, DeviceMapping } from './rfid.repository';

export type RfidScanEvent = {
  r: string;
  d: string;
  t1: number;
  receivedAt: string;
};

export type EnrichedRfidEvent = RfidScanEvent & {
  personName: string | null;
  personType: 'staff' | 'student' | null;
  personId: string | null;
};

export type PersonResult = PersonRow;

type RfidRecord = { r?: string; rfid?: string; d?: string; device?: string; t1: number | string };

const MAX_EVENTS = 100;

@Injectable()
export class RfidService {
  private readonly logger = new Logger(RfidService.name);

  constructor(
    private readonly rfidRepository: RfidRepository,
    private readonly redisService: RedisService,
  ) {}

  private cacheKey(schoolId: string) {
    return `rfid:${schoolId}`;
  }

  async handleScans(ses: RfidRecord[]): Promise<void> {
    for (const r of ses) {
      await this.push(r);
    }
  }

  async getEnrichedEvents(schoolId: string): Promise<EnrichedRfidEvent[]> {
    const key = `${this.cacheKey(schoolId)}:persons`;
    const persons = await this.redisService.getOrSet(key, CacheTTL.SHORT, () =>
      this.rfidRepository.getAllPersonsWithRfid(schoolId),
    );

    const rfidMap = new Map(persons.map((p) => [p.rfid, p]));
    const rows = await this.rfidRepository.findRecentBySchool(schoolId, MAX_EVENTS);

    return rows.map((row) => {
      const person = rfidMap.get(row.rfid_card_id) ?? null;
      return {
        r: row.rfid_card_id,
        d: row.device_id,
        t1: row.t1,
        receivedAt: row.received_at.toISOString(),
        personName: person?.name ?? null,
        personType: person?.type ?? null,
        personId: person?.id ?? null,
      };
    });
  }

  async searchPersons(
    q: string,
    type: 'staff' | 'student' | 'all',
    schoolId: string,
  ): Promise<PersonResult[]> {
    const key = `${this.cacheKey(schoolId)}:search:${type}:${q}`;
    return this.redisService.getOrSet(key, CacheTTL.SHORT, () =>
      this.rfidRepository.searchPersons(q, type, schoolId),
    );
  }

  private async requireCurrentYear(schoolId: string) {
    const year = await this.rfidRepository.findCurrentAcademicYear(schoolId);
    if (!year) {
      throw new BadRequestException('Set a current academic year before assigning smart cards');
    }
    if (!year.is_enabled) {
      throw new BadRequestException(`The current academic year '${year.name}' is disabled`);
    }
    return year;
  }

  async getAssignableOverview(schoolId: string) {
    const year = await this.requireCurrentYear(schoolId);
    const [sectionCounts, staff] = await Promise.all([
      this.rfidRepository.countUnassignedStudentsBySection(schoolId, year.id),
      this.rfidRepository.findUnassignedStaff(schoolId),
    ]);
    const classes = new Map<
      string,
      {
        id: string;
        name: string;
        unassigned: number;
        sections: { id: string; name: string; unassigned: number }[];
      }
    >();
    for (const row of sectionCounts) {
      const cls = classes.get(row.class_id) ?? {
        id: row.class_id,
        name: row.class_name,
        unassigned: 0,
        sections: [],
      };
      cls.unassigned += row.unassigned;
      if (row.section_id && row.section_name) {
        cls.sections.push({
          id: row.section_id,
          name: row.section_name,
          unassigned: row.unassigned,
        });
      }
      classes.set(row.class_id, cls);
    }
    return {
      academic_year: { id: year.id, name: year.name },
      classes: [...classes.values()],
      staff,
    };
  }

  async getAssignableStudents(schoolId: string, classId: string, sectionId?: string) {
    const year = await this.requireCurrentYear(schoolId);
    return this.rfidRepository.findUnassignedStudents(schoolId, year.id, classId, sectionId);
  }

  async assignCard(
    rfidCardId: string,
    personType: 'staff' | 'student',
    personId: string,
    schoolId: string,
  ): Promise<void> {
    if (personType === 'student') {
      const year = await this.requireCurrentYear(schoolId);
      if (!(await this.rfidRepository.isEnrolledInYear(personId, schoolId, year.id))) {
        throw new BadRequestException(
          `This student is not enrolled in the current academic year (${year.name}) — smart cards can only be assigned for the current year`,
        );
      }
    }
    const owners = await this.rfidRepository.findCardOwners(rfidCardId, schoolId);
    if (owners.some((o) => o.id !== personId)) {
      throw new ConflictException(`Card '${rfidCardId}' is already assigned to someone else`);
    }

    if (personType === 'staff') {
      await this.rfidRepository.assignToStaff(rfidCardId, personId, schoolId);
      await this.redisService.delByPattern(`staff:${schoolId}:*`);
    } else {
      await this.rfidRepository.assignToStudent(rfidCardId, personId, schoolId);
      await this.redisService.delByPattern(`students:${schoolId}:*`);
    }
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
  }

  async unassignCard(
    personType: 'staff' | 'student',
    personId: string,
    schoolId: string,
  ): Promise<void> {
    if (personType === 'staff') {
      await this.rfidRepository.unassignFromStaff(personId, schoolId);
      await this.redisService.delByPattern(`staff:${schoolId}:*`);
    } else {
      await this.rfidRepository.unassignFromStudent(personId, schoolId);
      await this.redisService.delByPattern(`students:${schoolId}:*`);
    }
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
  }

  private isMapped(device: DeviceMapping | null): device is DeviceMapping & {
    assigned_school_id: string;
  } {
    return !!device?.assigned_school_id && device.status !== RfidDeviceStatus.RETIRED;
  }

  private async resolveTap(
    rfid: string,
    deviceId: string,
  ): Promise<{ schoolId: string | null; owner: CardOwner | null }> {
    const device = deviceId ? await this.rfidRepository.findDeviceByIdentifier(deviceId) : null;
    const mappedSchoolId = this.isMapped(device) ? device.assigned_school_id : null;

    const owners = await this.rfidRepository.findCardOwners(rfid, mappedSchoolId ?? undefined);
    if (owners.length > 1) {
      this.logger.warn(
        `Card ${rfid} on device ${deviceId || '(none)'} matches ${owners.length} people — not marking attendance`,
      );
    }
    const owner = owners.length === 1 ? owners[0] : null;

    if (device) await this.rfidRepository.touchDevice(device.id, new Date());

    return { schoolId: mappedSchoolId ?? owner?.school_id ?? null, owner };
  }

  private async push(r: RfidRecord) {
    const rfid = r.r ?? r.rfid ?? '';
    if (!rfid) return;

    const deviceId = r.d ?? r.device ?? '';
    const t1 = typeof r.t1 === 'number' ? r.t1 : new Date(r.t1).getTime();
    const receivedAt = new Date();

    try {
      const { schoolId, owner } = await this.resolveTap(rfid, deviceId);

      await this.rfidRepository.insert({
        id: randomUUID(),
        rfid_card_id: rfid,
        device_id: deviceId,
        school_id: schoolId,
        t1,
        source: 'webhook',
        received_at: receivedAt,
      });

      if (!owner) return;

      if (owner.type === 'student') {
        await this.rfidRepository.autoMarkStudentAttendance(owner.id, owner.school_id, receivedAt);
        await this.redisService.delByPattern(`attendance:${owner.school_id}:*`);
        this.logger.log(`Auto-marked attendance for student ${owner.id} via RFID`);

        await this.rfidRepository.autoMarkExamAttendance(owner.id, owner.school_id, receivedAt);
        await this.redisService.delByPattern(`exam:attendance:${owner.school_id}:*`);
        this.logger.log(`Auto-marked exam attendance for student ${owner.id} via RFID`);
      } else {
        await this.rfidRepository.autoMarkStaffAttendance(owner.id, owner.school_id, receivedAt);
        await this.redisService.delByPattern(`staff-attendance:${owner.school_id}:*`);
        this.logger.log(`Auto-marked attendance for staff ${owner.id} via RFID`);
      }
    } catch (err) {
      this.logger.error(`Failed to persist RFID event: ${err}`);
    }
  }
}
