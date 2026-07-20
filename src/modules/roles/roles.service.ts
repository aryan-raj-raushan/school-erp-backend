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
import { Role, NewRole } from './types/role.types';
import { CacheTTL } from '../../shared/constants';
import { PERMISSION_REGISTRY } from '../../shared/constants/permissions.registry';
import { ALL_SCHOOL_ROLES, SchoolRole, SystemSchoolRole } from '../../shared/enums';

/** name/slug/description for each auto-seeded system role, keyed by SchoolRole enum value */
const SYSTEM_ROLE_META: Record<
  SystemSchoolRole,
  { name: string; slug: string; description: string }
> = {
  [SchoolRole.SCHOOL_ADMIN]: {
    name: 'School Admin',
    slug: 'school_admin',
    description: 'Full access role auto-created on school registration',
  },
  [SchoolRole.PRINCIPAL]: {
    name: 'Principal',
    slug: 'principal',
    description: 'Broad operational access auto-created on school registration',
  },
  [SchoolRole.VICE_PRINCIPAL]: {
    name: 'Vice Principal',
    slug: 'vice_principal',
    description: 'Broad operational access auto-created on school registration',
  },
  [SchoolRole.TEACHER]: {
    name: 'Teacher',
    slug: 'teacher',
    description: 'Classroom & academic access auto-created on school registration',
  },
  [SchoolRole.CLASS_TEACHER]: {
    name: 'Class Teacher',
    slug: 'class_teacher',
    description: 'Classroom & academic access auto-created on school registration',
  },
  [SchoolRole.ACCOUNTANT]: {
    name: 'Accountant',
    slug: 'accountant',
    description: 'Fees & finance access auto-created on school registration',
  },
  [SchoolRole.LIBRARIAN]: {
    name: 'Librarian',
    slug: 'librarian',
    description: 'Baseline read access auto-created on school registration',
  },
};

const P = PERMISSION_REGISTRY;

const PRINCIPAL_PERMISSIONS = [
  P.students.view,
  P.students.create,
  P.students.update,
  P.staff.view,
  P.staff.create,
  P.staff.update,
  P.parents.view,
  P.parents.create,
  P.parents.update,
  P.attendance.view,
  P.attendance.create,
  P.attendance.update,
  P.leave.view,
  P.leave.approve,
  P.leave.reject,
  P.classes.view,
  P.subjects.view,
  P.timetable.view,
  P.classSubjectTeachers.view,
  P.syllabus.view,
  P.homework.view,
  P.admissions.view,
  P.admissions.create,
  P.admissions.update,
  P.exams.view,
  P.exams.create,
  P.exams.update,
  P.exams.publish,
  P.fees.view,
  P.fees.approve,
  P.finance.view,
  P.salary.view,
  P.reports.view,
  P.reports.export,
  P.communications.view,
  P.communications.create,
  P.communications.update,
  P.holidays.view,
  P.holidays.create,
  P.holidays.update,
  P.events.view,
  P.events.create,
  P.events.update,
  P.academic_years.view,
  P.settings.view,
  P.schoolSettings.view,
  P.roles.view,
];

const TEACHER_PERMISSIONS = [
  P.students.view,
  P.attendance.view,
  P.attendance.create,
  P.attendance.update,
  P.homework.view,
  P.homework.create,
  P.homework.update,
  P.syllabus.view,
  P.syllabus.create,
  P.syllabus.update,
  P.classSubjectTeachers.view,
  P.timetable.view,
  P.exams.view,
  P.exams.create,
  P.leave.view,
  P.communications.view,
];

const CLASS_TEACHER_PERMISSIONS = [...TEACHER_PERMISSIONS, P.leave.approve, P.students.update];

const ACCOUNTANT_PERMISSIONS = [
  P.fees.view,
  P.fees.create,
  P.fees.update,
  P.fees.delete,
  P.fees.approve,
  P.finance.view,
  P.finance.create,
  P.finance.update,
  P.finance.delete,
  P.salary.view,
  P.salary.create,
  P.salary.process,
  P.reports.view,
  P.reports.export,
  P.students.view,
  P.staff.view,
];

const LIBRARIAN_PERMISSIONS = [P.students.view, P.staff.view];

/** Default permission slugs for each non-admin auto-seeded system role. School Admin gets ALL permissions (handled separately). */
const SYSTEM_ROLE_DEFAULT_PERMISSIONS: Partial<Record<SchoolRole, string[]>> = {
  [SchoolRole.PRINCIPAL]: PRINCIPAL_PERMISSIONS,
  [SchoolRole.VICE_PRINCIPAL]: PRINCIPAL_PERMISSIONS,
  [SchoolRole.TEACHER]: TEACHER_PERMISSIONS,
  [SchoolRole.CLASS_TEACHER]: CLASS_TEACHER_PERMISSIONS,
  [SchoolRole.ACCOUNTANT]: ACCOUNTANT_PERMISSIONS,
  [SchoolRole.LIBRARIAN]: LIBRARIAN_PERMISSIONS,
};

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

    const updateData: Partial<NewRole> = {};
    if (dto.name != null) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description ?? null;
    if (dto.is_active != null) updateData.is_active = dto.is_active;

    const updated = await this.rolesRepo.update(id, schoolId, updateData);
    if (!updated) throw new NotFoundException(`Role '${id}' not found`);

    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
    // Invalidate user permission cache too — role deactivation must take effect immediately
    await this.permissionsService.invalidateSchoolPermissionCache(schoolId);
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

  /**
   * Seeds all predefined system roles (School Admin + the 6 staff roles) for a school.
   * Idempotent — safe to call again for the same school (upsertSystemRole upserts on
   * (school_id, slug)). Called on both self-signup and Super-Admin-driven school creation
   * so every school ends up with the same baseline role set.
   */
  async seedSystemRoles(schoolId: string): Promise<void> {
    const allPerms = await this.permissionsRepo.findAll();
    if (!allPerms.length) return;
    const permIdByName = new Map(allPerms.map((p) => [p.name, p.id]));

    for (const role of ALL_SCHOOL_ROLES) {
      const meta = SYSTEM_ROLE_META[role];
      await this.rolesRepo.upsertSystemRole({
        id: generateId(),
        school_id: schoolId,
        name: meta.name,
        slug: meta.slug,
        description: meta.description,
        is_system: true,
        is_active: true,
      });

      const roleId = await this.permissionsRepo.findRoleIdBySlug(schoolId, meta.slug);
      if (!roleId) continue;

      const permissionSlugs =
        role === SchoolRole.SCHOOL_ADMIN
          ? allPerms.map((p) => p.name)
          : (SYSTEM_ROLE_DEFAULT_PERMISSIONS[role] ?? []);

      const permissionIds = permissionSlugs
        .map((slug) => permIdByName.get(slug))
        .filter((id): id is string => !!id);

      await this.permissionsRepo.setRolePermissions(roleId, permissionIds);
    }

    await this.redisService.delByPattern(`${this.cacheKey(schoolId)}:*`);
  }
}
