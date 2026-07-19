import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CompanyUsersRepository } from './company-users.repository';
import { AuthRepository } from '../auth/auth.repository';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { hashPassword } from '../../utils/hash.utils';
import { PaginationResponse } from '../../shared/responses/api-response';
import { CreateCompanyUserDto } from './dto/create-company-user.dto';
import { UpdateCompanyUserDto } from './dto/update-company-user.dto';
import { CompanyUserFilterDto } from './dto/company-user-filter.dto';
import { CompanyRole } from '../../shared/enums';
import { CompanyUserProfile, AssignedSchool } from './types/company-user.types';

// SUPER_ADMIN accounts are never created/edited through this staff-management module.
const ASSIGNABLE_COMPANY_ROLES = [
  CompanyRole.ADMIN,
  CompanyRole.SUPPORT,
  CompanyRole.SALES,
  CompanyRole.OPERATOR,
];

@Injectable()
export class CompanyUsersService {
  constructor(
    private readonly companyUsersRepo: CompanyUsersRepository,
    private readonly authRepo: AuthRepository,
    private readonly redisService: RedisService,
  ) {}

  async findAll(filters: CompanyUserFilterDto): Promise<PaginationResponse<CompanyUserProfile>> {
    const [items, total] = await Promise.all([
      this.companyUsersRepo.findAll(filters),
      this.companyUsersRepo.count(filters),
    ]);
    return PaginationResponse.of(items, total, filters);
  }

  async findById(id: string): Promise<CompanyUserProfile> {
    const user = await this.companyUsersRepo.findById(id);
    if (!user) throw new NotFoundException(`Company user with id '${id}' not found`);
    return user;
  }

  async create(dto: CreateCompanyUserDto): Promise<CompanyUserProfile> {
    if (!ASSIGNABLE_COMPANY_ROLES.includes(dto.role)) {
      throw new BadRequestException(`Cannot create a company user with role '${dto.role}'`);
    }
    const exists = await this.authRepo.findCompanyUserByEmailExists(dto.email);
    if (exists) throw new ConflictException(`Email '${dto.email}' is already in use`);

    const password_hash = await hashPassword(dto.password);
    const created = await this.authRepo.createCompanyUser({
      id: generateId(),
      first_name: dto.first_name,
      last_name: dto.last_name,
      email: dto.email,
      password_hash,
      role: dto.role,
    });
    return this.findById(created.id);
  }

  async update(id: string, dto: UpdateCompanyUserDto): Promise<CompanyUserProfile> {
    await this.findById(id);
    if (dto.role && !ASSIGNABLE_COMPANY_ROLES.includes(dto.role)) {
      throw new BadRequestException(`Cannot assign role '${dto.role}'`);
    }
    return this.companyUsersRepo.update(id, dto);
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.companyUsersRepo.softDelete(id);
    await this.redisService.del(`company_user:${id}:schools`);
  }

  async listSchools(userId: string): Promise<AssignedSchool[]> {
    await this.findById(userId);
    return this.companyUsersRepo.listSchoolsForUser(userId);
  }

  async assignSchool(
    userId: string,
    schoolId: string,
    grantedBy: string,
  ): Promise<AssignedSchool[]> {
    await this.findById(userId);
    await this.companyUsersRepo.assignSchool(userId, schoolId, grantedBy);
    await this.redisService.del(`company_user:${userId}:schools`);
    return this.listSchools(userId);
  }

  async unassignSchool(userId: string, schoolId: string): Promise<AssignedSchool[]> {
    await this.findById(userId);
    await this.companyUsersRepo.unassignSchool(userId, schoolId);
    await this.redisService.del(`company_user:${userId}:schools`);
    return this.listSchools(userId);
  }
}
