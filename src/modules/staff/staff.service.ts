import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { StaffRepository } from './staff.repository';
import { RolesRepository } from '../roles/roles.repository';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { generateTempPassword, hashPassword } from '../../utils/hash.utils';
import { PaginationResponse } from '../../shared/responses/api-response';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { FilterStaffDto } from './dto/filter-staff.dto';
import { StaffLoginCredentials, StaffMember } from './types/staff.types';
import { SchoolRole } from '../../shared/enums';
import { CacheTTL, JobTTL } from '../../shared/constants';

@Injectable()
export class StaffService {
  constructor(
    private readonly staffRepo: StaffRepository,
    private readonly rolesRepo: RolesRepository,
    private readonly redisService: RedisService,
  ) {}

  private cacheKey(schoolId: string) {
    return `staff:${schoolId}`;
  }

  private async invalidate(schoolId: string): Promise<void> {
    await Promise.all([
      this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`),
      this.redisService.delByPattern(`staff-attendance:${schoolId}:*`),
      this.redisService.delByPattern(`dashboard:*:${schoolId}:*`),
      this.redisService.delByPattern(`reports:admin:${schoolId}`),
    ]);
  }

  async findAll(
    schoolId: string,
    filters: FilterStaffDto,
  ): Promise<PaginationResponse<StaffMember>> {
    const { page = 1, limit = 20 } = filters;
    const key = `${this.cacheKey(schoolId)}:list:${JSON.stringify(filters)}`;
    return this.redisService.getOrSet(key, CacheTTL.MEDIUM, async () => {
      const [items, total] = await Promise.all([
        this.staffRepo.findAll(schoolId, filters),
        this.staffRepo.count(schoolId, filters),
      ]);
      return PaginationResponse.of(items, total, { page, limit });
    });
  }

  async findById(id: string, schoolId: string): Promise<StaffMember> {
    const key = `${this.cacheKey(schoolId)}:${id}`;
    return this.redisService.getOrSet(key, CacheTTL.MEDIUM, async () => {
      const member = await this.staffRepo.findById(id, schoolId);
      if (!member) throw new NotFoundException(`Staff member with id '${id}' not found`);
      return member;
    });
  }

  async create(
    dto: CreateStaffDto,
    schoolId: string,
    createdBy: string,
  ): Promise<{
    staff: StaffMember;
    inviteToken: string;
    login_credentials?: StaffLoginCredentials;
  }> {
    const existing = await this.staffRepo.findByPhone(dto.phone_number, dto.dial_code, schoolId);
    if (existing) {
      throw new ConflictException('A staff member with this phone number already exists');
    }

    if (!dto.role && !dto.custom_role_id) {
      throw new BadRequestException('Either role or custom_role_id must be provided');
    }

    if (dto.custom_role_id) {
      const customRole = await this.rolesRepo.findById(dto.custom_role_id, schoolId);
      if (!customRole) {
        throw new NotFoundException(`Role with id '${dto.custom_role_id}' not found`);
      }
    }

    const temporaryPassword = generateTempPassword();
    const password_hash = await hashPassword(dto.password || temporaryPassword);
    const id = generateId();

    const staff = await this.staffRepo.create({
      id,
      school_id: schoolId,
      created_by: createdBy,
      password_hash,
      must_change_password: true,
      is_active: dto.is_active ?? true,
      dial_code: dto.dial_code,
      phone_number: dto.phone_number,
      salutation: dto.salutation,
      first_name: dto.first_name,
      last_name: dto.last_name,
      email: dto.email,
      role: dto.role ?? SchoolRole.OTHER,
      gender: dto.gender,
      date_of_birth: dto.date_of_birth ? new Date(dto.date_of_birth) : undefined,
      blood_group: dto.blood_group,
      address: dto.address,
      permanent_address: dto.permanent_address,
      city: dto.city,
      joining_date: dto.joining_date ? new Date(dto.joining_date) : undefined,
      employee_code: dto.employee_code,
      custom_role_id: dto.custom_role_id,
      father_name: dto.father_name,
      husband_name: dto.husband_name,
      reporting_to_id: dto.reporting_to_id,
      rfid_card_number: dto.rfid_card_number,
      qualification: dto.qualification,
      previous_employer: dto.previous_employer,
      previous_role: dto.previous_role,
      total_experience: dto.total_experience,
      profile_image: dto.profile_image,
    });

    const inviteToken = await this.generateInviteToken(id, schoolId);
    await this.invalidate(schoolId);

    if (dto.password) return { staff, inviteToken };
    return {
      staff,
      inviteToken,
      login_credentials: { login_id: dto.phone_number, temporary_password: temporaryPassword },
    };
  }

  async resetPassword(id: string, schoolId: string): Promise<StaffLoginCredentials> {
    const member = await this.findById(id, schoolId);
    const temporaryPassword = generateTempPassword();
    await this.staffRepo.setTemporaryPassword(id, schoolId, await hashPassword(temporaryPassword));
    await this.redisService.revokeUserSessions(id);
    return { login_id: member.phone_number, temporary_password: temporaryPassword };
  }

  async update(id: string, schoolId: string, dto: UpdateStaffDto): Promise<StaffMember> {
    await this.findById(id, schoolId);

    if (dto.custom_role_id) {
      const customRole = await this.rolesRepo.findById(dto.custom_role_id, schoolId);
      if (!customRole) {
        throw new NotFoundException(`Role with id '${dto.custom_role_id}' not found`);
      }
    }

    const updated = await this.staffRepo.update(id, schoolId, {
      ...dto,
      date_of_birth: dto.date_of_birth ? new Date(dto.date_of_birth) : undefined,
      joining_date: dto.joining_date ? new Date(dto.joining_date) : undefined,
    });
    await this.invalidate(schoolId);
    return updated;
  }

  async remove(id: string, schoolId: string): Promise<void> {
    await this.findById(id, schoolId);
    await this.staffRepo.softDelete(id, schoolId);
    await this.invalidate(schoolId);
  }

  async offboard(id: string, schoolId: string): Promise<StaffMember> {
    await this.findById(id, schoolId);
    const updated = await this.staffRepo.setActiveStatus(id, schoolId, false);
    await this.invalidate(schoolId);
    return updated;
  }

  async reonboard(id: string, schoolId: string): Promise<StaffMember> {
    const member = await this.staffRepo.findById(id, schoolId);
    if (!member) throw new NotFoundException(`Staff member with id '${id}' not found`);
    const updated = await this.staffRepo.setActiveStatus(id, schoolId, true);
    await this.invalidate(schoolId);
    return updated;
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
    await this.redisService.setex(
      `invite:${token}`,
      JobTTL.INVITE_SECONDS,
      JSON.stringify({ userId, schoolId }),
    );
    return token;
  }
}
