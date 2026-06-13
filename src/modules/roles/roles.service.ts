import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { RolesRepository } from './roles.repository';
import { PermissionsRepository } from '../permissions/permissions.repository';
import { PermissionsService } from '../permissions/permissions.service';
import { RedisService } from '../redis/redis.service';
import { generateId } from '../../utils/uuid.utils';
import { PaginationResponse } from '../../shared/responses/api-response';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { FilterRoleDto } from './dto/filter-role.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { Role } from './types/role.types';
import { CacheTTL } from '../../shared/constants';

@Injectable()
export class RolesService {
  constructor(
    private readonly rolesRepo: RolesRepository,
    private readonly permissionsRepo: PermissionsRepository,
    private readonly permissionsService: PermissionsService,
    private readonly redisService: RedisService,
  ) {}

  private cacheKey(schoolId: string): string {
    return `roles:${schoolId}`;
  }

  private toSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  }

  async findAll(schoolId: string, filters: FilterRoleDto): Promise<PaginationResponse<Role>> {
    const key = `${this.cacheKey(schoolId)}:list:${JSON.stringify(filters)}`;
    return this.redisService.getOrSet(key, CacheTTL.MEDIUM, async () => {
      const [items, total] = await Promise.all([
        this.rolesRepo.findAll(schoolId, filters),
        this.rolesRepo.count(schoolId, filters),
      ]);
      return PaginationResponse.of(items, total, filters);
    });
  }

  async findById(id: string, schoolId: string): Promise<Role> {
    const key = `${this.cacheKey(schoolId)}:${id}`;
    return this.redisService.getOrSet(key, CacheTTL.MEDIUM, async () => {
      const role = await this.rolesRepo.findById(id, schoolId);
      if (!role) throw new NotFoundException(`Role '${id}' not found`);
      return role;
    });
  }

  async create(dto: CreateRoleDto, schoolId: string, createdBy: string): Promise<Role> {
    const slug = dto.slug ?? this.toSlug(dto.name);

    const existing = await this.rolesRepo.findBySlug(slug, schoolId);
    if (existing) throw new ConflictException(`A role with slug '${slug}' already exists`);

    const role = await this.rolesRepo.create({
      id: generateId(),
      school_id: schoolId,
      created_by: createdBy,
      name: dto.name,
      slug,
      description: dto.description,
      is_system: false,
      is_active: dto.is_active ?? true,
    });

    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return role;
  }

  async update(id: string, schoolId: string, dto: UpdateRoleDto): Promise<Role> {
    const existing = await this.findById(id, schoolId);
    if (existing.is_system && dto.name) {
      throw new BadRequestException('Cannot rename system roles');
    }

    const updated = await this.rolesRepo.update(id, schoolId, dto);
    if (!updated) throw new NotFoundException(`Role '${id}' not found`);

    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    return updated;
  }

  async remove(id: string, schoolId: string): Promise<void> {
    const role = await this.findById(id, schoolId);
    if (role.is_system) throw new BadRequestException('System roles cannot be deleted');

    await this.rolesRepo.softDelete(id, schoolId);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    await this.permissionsService.invalidateSchoolPermissionCache(schoolId);
  }

  async assignPermissions(
    id: string,
    schoolId: string,
    dto: AssignPermissionsDto,
  ): Promise<{ assigned: number }> {
    await this.findById(id, schoolId);

    const found = await this.permissionsRepo.findByIds(dto.permission_ids);
    if (found.length !== dto.permission_ids.length) {
      const foundIds = new Set(found.map((p) => p.id));
      const invalid = dto.permission_ids.filter((pid) => !foundIds.has(pid));
      throw new BadRequestException(`Invalid permission IDs: ${invalid.join(', ')}`);
    }

    await this.permissionsRepo.setRolePermissions(id, dto.permission_ids);
    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    await this.permissionsService.invalidateSchoolPermissionCache(schoolId);

    return { assigned: dto.permission_ids.length };
  }

  async getRolePermissions(id: string, schoolId: string): Promise<string[]> {
    await this.findById(id, schoolId);
    return this.permissionsRepo.findPermissionsByRoleId(id);
  }
}
