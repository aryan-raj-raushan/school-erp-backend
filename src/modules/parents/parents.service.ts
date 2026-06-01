import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { ParentsRepository } from './parents.repository';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { PaginationResponse } from '../../shared/responses/api-response';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
import { FilterParentDto } from './dto/filter-parent.dto';
import { Parent, BulkJobResult } from './types/parent.types';

const CACHE_TTL = 120;
const BULK_JOB_TTL = 24 * 60 * 60;
const TEMPLATE_HEADERS = ['first_name', 'last_name', 'dial_code', 'phone_number', 'email', 'occupation'];

@Injectable()
export class ParentsService {
  constructor(
    private readonly parentsRepo: ParentsRepository,
    private readonly redisService: RedisService,
  ) {}

  private cacheKey(schoolId: string) {
    return `parents:${schoolId}`;
  }

  async findAll(schoolId: string, filters: FilterParentDto): Promise<PaginationResponse<Parent>> {
    const { page = 1, limit = 20 } = filters;
    const key = `${this.cacheKey(schoolId)}:list:${JSON.stringify(filters)}`;
    return this.redisService.getOrSet(key, CACHE_TTL, async () => {
      const [items, total] = await Promise.all([
        this.parentsRepo.findAll(schoolId, filters),
        this.parentsRepo.count(schoolId, filters),
      ]);
      return PaginationResponse.of(items, total, { page, limit });
    });
  }

  async findById(id: string, schoolId: string): Promise<Parent> {
    const key = `${this.cacheKey(schoolId)}:${id}`;
    return this.redisService.getOrSet(key, CACHE_TTL, async () => {
      const parent = await this.parentsRepo.findById(id, schoolId);
      if (!parent) throw new NotFoundException(`Parent with id '${id}' not found`);
      return parent;
    });
  }

  async create(dto: CreateParentDto, schoolId: string, createdBy: string): Promise<Parent> {
    const existing = await this.parentsRepo.findByPhone(dto.phone_number, dto.dial_code, schoolId);
    if (existing) throw new ConflictException('A parent with this phone number already exists');

    const parent = await this.parentsRepo.create({ id: generateId(), school_id: schoolId, created_by: createdBy, ...dto });
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return parent;
  }

  async update(id: string, schoolId: string, dto: UpdateParentDto): Promise<Parent> {
    await this.findById(id, schoolId);
    const updated = await this.parentsRepo.update(id, schoolId, dto);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return updated;
  }

  async remove(id: string, schoolId: string): Promise<void> {
    await this.findById(id, schoolId);
    await this.parentsRepo.softDelete(id, schoolId);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
  }

  async linkStudent(parentId: string, studentId: string, schoolId: string, relation = 'GUARDIAN'): Promise<void> {
    await this.findById(parentId, schoolId);
    await this.parentsRepo.linkStudent(generateId(), parentId, studentId, schoolId, relation);
  }

  async getStudentDetail(parentId: string, schoolId: string) {
    await this.findById(parentId, schoolId);
    return this.parentsRepo.getLinkedStudents(parentId, schoolId);
  }

  async getBulkTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Parent Import');
    sheet.columns = TEMPLATE_HEADERS.map((h) => ({ header: h, key: h, width: 20 }));
    sheet.addRow({ first_name: 'Rakesh', last_name: 'Sharma', dial_code: '+91', phone_number: '9876543210', email: 'rakesh@example.com', occupation: 'Engineer' });
    return workbook.xlsx.writeBuffer() as Promise<Buffer>;
  }

  async bulkImport(fileBuffer: Buffer, schoolId: string, createdBy: string): Promise<{ jobId: string }> {
    const jobId = generateId();
    const jobKey = `bulk_job:parent:${jobId}`;
    await this.redisService.setex(jobKey, BULK_JOB_TTL, JSON.stringify({ jobId, status: 'PENDING' }));
    setImmediate(() => this.processBulk(jobId, jobKey, fileBuffer, schoolId, createdBy));
    return { jobId };
  }

  async getBulkStatus(jobId: string): Promise<BulkJobResult> {
    const raw = await this.redisService.get(`bulk_job:parent:${jobId}`);
    if (!raw) throw new NotFoundException(`Job '${jobId}' not found or expired`);
    return JSON.parse(raw) as BulkJobResult;
  }

  private async processBulk(jobId: string, jobKey: string, fileBuffer: Buffer, schoolId: string, createdBy: string): Promise<void> {
    await this.redisService.setex(jobKey, BULK_JOB_TTL, JSON.stringify({ jobId, status: 'PROCESSING' }));
    const errors: string[] = [];
    let created = 0;

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer);
      const sheet = workbook.getWorksheet(1);
      if (!sheet) {
        await this.redisService.setex(jobKey, BULK_JOB_TTL, JSON.stringify({ jobId, status: 'FAILED', errors: ['No worksheet found'] }));
        return;
      }

      const rows: any[] = [];
      sheet.eachRow((row, rowNumber) => { if (rowNumber > 1) rows.push(row.values); });

      for (let i = 0; i < rows.length; i++) {
        const [, first_name, last_name, dial_code, phone_number, email, occupation] = rows[i];
        if (!first_name || !phone_number || !dial_code) {
          errors.push(`Row ${i + 2}: missing required fields`);
          continue;
        }
        try {
          const existing = await this.parentsRepo.findByPhone(String(phone_number), String(dial_code), schoolId);
          if (existing) { errors.push(`Row ${i + 2}: phone '${phone_number}' already exists`); continue; }
          await this.parentsRepo.create({ id: generateId(), school_id: schoolId, created_by: createdBy, first_name: String(first_name), last_name: last_name ? String(last_name) : undefined, dial_code: String(dial_code), phone_number: String(phone_number), email: email ? String(email) : undefined, occupation: occupation ? String(occupation) : undefined });
          created++;
        } catch { errors.push(`Row ${i + 2}: failed to create`); }
      }

      await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
      await this.redisService.setex(jobKey, BULK_JOB_TTL, JSON.stringify({ jobId, status: 'COMPLETED', total: rows.length, created, failed: errors.length, errors, completedAt: new Date().toISOString() }));
    } catch (err) {
      await this.redisService.setex(jobKey, BULK_JOB_TTL, JSON.stringify({ jobId, status: 'FAILED', errors: [(err as Error).message] }));
    }
  }
}
