import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SchoolsRepository } from './schools.repository';
import { AuthRepository } from '../auth/auth.repository';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { StringUtils } from '../../utils/string.utils';
import { PaginationResponse } from '../../shared/responses/api-response';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { SchoolFilterDto } from './dto/school-filter.dto';
import { School } from './types/school.types';
import { CompanyRole } from '../../shared/enums';
import { CacheTTL } from '../../shared/constants';

@Injectable()
export class SchoolsService {
  constructor(
    private readonly schoolsRepo: SchoolsRepository,
    private readonly authRepo: AuthRepository,
    private readonly redisService: RedisService,
  ) {}

  // BUG-003/004/005: returns null for SUPER_ADMIN (= all access), array for others
  private async getPermittedSchoolIds(userId: string, role: string): Promise<string[] | null> {
    if (role === CompanyRole.SUPER_ADMIN) return null;

    const key = `company_user:${userId}:schools`;
    let ids = await this.redisService.smembers(key);

    if (ids.length === 0) {
      ids = await this.schoolsRepo.findSchoolIdsByCompanyUserId(userId);
      if (ids.length > 0) {
        await this.redisService.sadd(key, ...ids);
        await this.redisService.expire(key, CacheTTL.HOUR);
      }
    }

    return ids;
  }

  private async assertSchoolAccess(schoolId: string, userId: string, role: string): Promise<void> {
    const permitted = await this.getPermittedSchoolIds(userId, role);
    if (permitted !== null && !permitted.includes(schoolId)) {
      throw new ForbiddenException('Access denied to this school');
    }
  }

  async findAll(
    filters: SchoolFilterDto,
    userId: string,
    role: string,
  ): Promise<PaginationResponse<School>> {
    const allowedIds = await this.getPermittedSchoolIds(userId, role);
    const cacheKey = `schools:list:${userId}:${JSON.stringify(filters)}`;
    return this.redisService.getOrSet(cacheKey, CacheTTL.LONG, async () => {
      const [items, total] = await Promise.all([
        this.schoolsRepo.findAll(filters, allowedIds ?? undefined),
        this.schoolsRepo.count(filters, allowedIds ?? undefined),
      ]);
      return PaginationResponse.of(items, total, filters);
    });
  }

  async findById(id: string, userId: string, role: string): Promise<School> {
    await this.assertSchoolAccess(id, userId, role);
    const cacheKey = `schools:${id}`;
    return this.redisService.getOrSet(cacheKey, CacheTTL.LONG, async () => {
      const school = await this.schoolsRepo.findById(id);
      if (!school) throw new NotFoundException(`School with id '${id}' not found`);
      return school;
    });
  }

  async create(dto: CreateSchoolDto, createdBy: string): Promise<School> {
    if (StringUtils.isNotEmpty(dto.code)) {
      const existing = await this.schoolsRepo.findByCode(dto.code!);
      if (existing) throw new ConflictException(`School with code '${dto.code}' already exists`);
    }

    // Validate admin identifier before creating school
    if (dto.admin_phone && !dto.admin_first_name) {
      throw new BadRequestException('admin_first_name is required when admin_phone is provided');
    }
    if (dto.admin_email && !dto.admin_phone && !dto.admin_first_name) {
      throw new BadRequestException('admin_first_name is required when admin_email is provided');
    }

    const {
      admin_first_name,
      admin_last_name,
      admin_phone,
      admin_email,
      admin_dial_code,
      ...schoolData
    } = dto;

    const school = await this.schoolsRepo.create({
      id: generateId(),
      created_by: createdBy,
      ...schoolData,
    });

    // Auto-create SCHOOL_ADMIN without password if admin contact provided
    if (admin_phone || admin_email) {
      const dialCode = admin_dial_code ?? dto.dial_code ?? '+91';
      const phone = admin_phone ?? '0000000000';

      const alreadyExists = admin_phone
        ? await this.authRepo.findSchoolUserByPhoneExists(phone, dialCode, school.id)
        : false;

      if (!alreadyExists) {
        await this.authRepo.createSchoolUserWithoutPassword({
          id: generateId(),
          school_id: school.id,
          first_name: admin_first_name ?? 'Admin',
          last_name: admin_last_name,
          dial_code: dialCode,
          phone_number: phone,
          email: admin_email,
          created_by: createdBy,
        });
      }
    }

    await this.redisService.delByPattern(`schools:list:*`);
    return school;
  }

  async update(id: string, dto: UpdateSchoolDto, userId: string, role: string): Promise<School> {
    await this.assertSchoolAccess(id, userId, role);
    await this.findById(id, userId, role);

    if (StringUtils.isNotEmpty(dto.code)) {
      const existing = await this.schoolsRepo.findByCode(dto.code!);
      if (existing && existing.id !== id) {
        throw new ConflictException(`School code '${dto.code}' already in use`);
      }
    }

    const updated = await this.schoolsRepo.update(id, dto);
    await this.redisService.del(`schools:${id}`);
    await this.redisService.delByPattern(`schools:list:*`);
    return updated;
  }

  async getMyProfile(schoolId: string): Promise<School> {
    const cacheKey = `schools:${schoolId}`;
    return this.redisService.getOrSet(cacheKey, CacheTTL.LONG, async () => {
      const school = await this.schoolsRepo.findById(schoolId);
      if (!school) throw new NotFoundException('School not found');
      return school;
    });
  }

  async updateMyProfile(schoolId: string, dto: UpdateSchoolDto): Promise<School> {
    const school = await this.schoolsRepo.findById(schoolId);
    if (!school) throw new NotFoundException('School not found');

    if (dto.code && dto.code !== school.code) {
      const existing = await this.schoolsRepo.findByCode(dto.code);
      if (existing) throw new ConflictException(`School code '${dto.code}' already in use`);
    }

    const updated = await this.schoolsRepo.update(schoolId, dto);
    await this.redisService.del(`schools:${schoolId}`);
    await this.redisService.delByPattern(`schools:list:*`);
    return updated;
  }

  async remove(id: string, userId: string, role: string): Promise<void> {
    await this.assertSchoolAccess(id, userId, role);
    await this.findById(id, userId, role);
    await this.schoolsRepo.softDelete(id);
    await this.redisService.del(`schools:${id}`);
    await this.redisService.delByPattern(`schools:list:*`);
  }
}
