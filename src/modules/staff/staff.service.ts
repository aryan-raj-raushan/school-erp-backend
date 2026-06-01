import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { StaffRepository } from './staff.repository';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { hashPassword } from '../../utils/hash.utils';
import { PaginationResponse } from '../../shared/responses/api-response';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { FilterStaffDto } from './dto/filter-staff.dto';
import { StaffMember, BulkJobResult } from './types/staff.types';
import { SchoolRole } from '../../shared/enums';

const CACHE_TTL = 120;
const INVITE_TTL = 7 * 24 * 60 * 60; // 7 days
const BULK_JOB_TTL = 24 * 60 * 60;    // 24 hours
const TEMP_PASSWORD = 'TrueSkul@123';

const TEMPLATE_HEADERS = ['first_name', 'last_name', 'dial_code', 'phone_number', 'email', 'role', 'gender', 'date_of_birth'];

@Injectable()
export class StaffService {
  constructor(
    private readonly staffRepo: StaffRepository,
    private readonly redisService: RedisService,
  ) {}

  private cacheKey(schoolId: string) {
    return `staff:${schoolId}`;
  }

  async findAll(schoolId: string, filters: FilterStaffDto): Promise<PaginationResponse<StaffMember>> {
    const { page = 1, limit = 20 } = filters;
    const key = `${this.cacheKey(schoolId)}:list:${JSON.stringify(filters)}`;
    return this.redisService.getOrSet(key, CACHE_TTL, async () => {
      const [items, total] = await Promise.all([
        this.staffRepo.findAll(schoolId, filters),
        this.staffRepo.count(schoolId, filters),
      ]);
      return PaginationResponse.of(items, total, { page, limit });
    });
  }

  async findById(id: string, schoolId: string): Promise<StaffMember> {
    const key = `${this.cacheKey(schoolId)}:${id}`;
    return this.redisService.getOrSet(key, CACHE_TTL, async () => {
      const member = await this.staffRepo.findById(id, schoolId);
      if (!member) throw new NotFoundException(`Staff member with id '${id}' not found`);
      return member;
    });
  }

  async create(dto: CreateStaffDto, schoolId: string, createdBy: string): Promise<{ staff: StaffMember; inviteToken: string }> {
    const existing = await this.staffRepo.findByPhone(dto.phone_number, dto.dial_code, schoolId);
    if (existing) {
      throw new ConflictException('A staff member with this phone number already exists');
    }

    const password_hash = await hashPassword(TEMP_PASSWORD);
    const id = generateId();

    const staff = await this.staffRepo.create({
      id,
      school_id: schoolId,
      created_by: createdBy,
      password_hash,
      dial_code: dto.dial_code,
      phone_number: dto.phone_number,
      first_name: dto.first_name,
      last_name: dto.last_name,
      email: dto.email,
      role: dto.role,
      gender: dto.gender,
      date_of_birth: dto.date_of_birth ? new Date(dto.date_of_birth) : undefined,
      blood_group: dto.blood_group,
      address: dto.address,
    });

    const inviteToken = await this.generateInviteToken(id, schoolId);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);

    return { staff, inviteToken };
  }

  async update(id: string, schoolId: string, dto: UpdateStaffDto): Promise<StaffMember> {
    await this.findById(id, schoolId);
    const updated = await this.staffRepo.update(id, schoolId, {
      ...dto,
      date_of_birth: dto.date_of_birth ? new Date(dto.date_of_birth) : undefined,
    });
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return updated;
  }

  async remove(id: string, schoolId: string): Promise<void> {
    await this.findById(id, schoolId);
    await this.staffRepo.softDelete(id, schoolId);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
  }

  async offboard(id: string, schoolId: string): Promise<StaffMember> {
    await this.findById(id, schoolId);
    const updated = await this.staffRepo.setActiveStatus(id, schoolId, false);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return updated;
  }

  async reonboard(id: string, schoolId: string): Promise<StaffMember> {
    const member = await this.staffRepo.findById(id, schoolId);
    if (!member) throw new NotFoundException(`Staff member with id '${id}' not found`);
    const updated = await this.staffRepo.setActiveStatus(id, schoolId, true);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return updated;
  }

  async getBulkTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Staff Import');

    sheet.columns = TEMPLATE_HEADERS.map((h) => ({ header: h, key: h, width: 20 }));
    sheet.addRow({
      first_name: 'John',
      last_name: 'Doe',
      dial_code: '+91',
      phone_number: '9876543210',
      email: 'john.doe@school.com',
      role: SchoolRole.TEACHER,
      gender: 'MALE',
      date_of_birth: '1990-05-15',
    });

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async bulkImport(fileBuffer: Buffer, schoolId: string, createdBy: string): Promise<{ jobId: string }> {
    const jobId = generateId();
    const jobKey = `bulk_job:staff:${jobId}`;

    await this.redisService.setex(jobKey, BULK_JOB_TTL, JSON.stringify({ jobId, status: 'PENDING' }));

    setImmediate(() => this.processBulkImport(jobId, jobKey, fileBuffer, schoolId, createdBy));

    return { jobId };
  }

  async getBulkStatus(jobId: string): Promise<BulkJobResult> {
    const jobKey = `bulk_job:staff:${jobId}`;
    const raw = await this.redisService.get(jobKey);
    if (!raw) throw new NotFoundException(`Job '${jobId}' not found or expired`);
    return JSON.parse(raw) as BulkJobResult;
  }

  async verifyInviteToken(token: string): Promise<{ userId: string; schoolId: string }> {
    const raw = await this.redisService.get(`invite:${token}`);
    if (!raw) throw new BadRequestException('Invalid or expired invite token');
    return JSON.parse(raw);
  }

  async resendInvite(userId: string, schoolId: string): Promise<{ inviteToken: string }> {
    const member = await this.staffRepo.findById(userId, schoolId);
    if (!member) throw new NotFoundException(`Staff member with id '${userId}' not found`);

    await this.redisService.delByPattern(`invite:*`);
    const inviteToken = await this.generateInviteToken(userId, schoolId);
    return { inviteToken };
  }

  private async generateInviteToken(userId: string, schoolId: string): Promise<string> {
    const token = generateId();
    await this.redisService.setex(`invite:${token}`, INVITE_TTL, JSON.stringify({ userId, schoolId }));
    return token;
  }

  private async processBulkImport(
    jobId: string,
    jobKey: string,
    fileBuffer: Buffer,
    schoolId: string,
    createdBy: string,
  ): Promise<void> {
    await this.redisService.setex(jobKey, BULK_JOB_TTL, JSON.stringify({ jobId, status: 'PROCESSING' }));

    const errors: string[] = [];
    let created = 0;

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer as unknown as ExcelJS.Buffer);
      const sheet = workbook.getWorksheet(1);

      if (!sheet) {
        await this.redisService.setex(
          jobKey,
          BULK_JOB_TTL,
          JSON.stringify({ jobId, status: 'FAILED', errors: ['No worksheet found in file'] }),
        );
        return;
      }

      const rows: any[] = [];
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // skip header
        rows.push(row.values);
      });

      const password_hash = await hashPassword(TEMP_PASSWORD);

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const [, first_name, last_name, dial_code, phone_number, email, role, gender, date_of_birth] = row;

        if (!first_name || !phone_number || !dial_code || !role) {
          errors.push(`Row ${i + 2}: missing required fields (first_name, dial_code, phone_number, role)`);
          continue;
        }

        if (!Object.values(SchoolRole).includes(role)) {
          errors.push(`Row ${i + 2}: invalid role '${role}'`);
          continue;
        }

        try {
          const existing = await this.staffRepo.findByPhone(String(phone_number), String(dial_code), schoolId);
          if (existing) {
            errors.push(`Row ${i + 2}: phone number '${phone_number}' already exists`);
            continue;
          }

          await this.staffRepo.create({
            id: generateId(),
            school_id: schoolId,
            created_by: createdBy,
            first_name: String(first_name),
            last_name: last_name ? String(last_name) : undefined,
            dial_code: String(dial_code),
            phone_number: String(phone_number),
            email: email ? String(email) : undefined,
            role: role as SchoolRole,
            gender: gender ? String(gender) : undefined,
            date_of_birth: date_of_birth ? new Date(date_of_birth) : undefined,
            password_hash,
          });
          created++;
        } catch {
          errors.push(`Row ${i + 2}: failed to create staff member`);
        }
      }

      await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);

      await this.redisService.setex(
        jobKey,
        BULK_JOB_TTL,
        JSON.stringify({
          jobId,
          status: 'COMPLETED',
          total: rows.length,
          created,
          failed: errors.length,
          errors,
          completedAt: new Date().toISOString(),
        }),
      );
    } catch (err) {
      await this.redisService.setex(
        jobKey,
        BULK_JOB_TTL,
        JSON.stringify({ jobId, status: 'FAILED', errors: [(err as Error).message] }),
      );
    }
  }
}
