import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { generateId } from '../../utils/uuid.utils';
import { CompanyRole } from '../../shared/enums';
import {
  BUILT_IN_PLATFORM_PERMISSIONS,
  PLATFORM_PERMISSION_CATALOG,
} from '../../shared/constants/platform-permissions';
import { CompanyRolesRepository } from './company-roles.repository';
import { CompanyAccessService } from './company-access.service';
import { CreateCompanyRoleDto, UpdateCompanyRoleDto } from './dto/company-role.dto';

@Injectable()
export class CompanyRolesService {
  constructor(
    private readonly repo: CompanyRolesRepository,
    private readonly access: CompanyAccessService,
  ) {}

  catalog() {
    return {
      modules: PLATFORM_PERMISSION_CATALOG,
      built_in_roles: Object.values(CompanyRole)
        .filter((role) => role !== CompanyRole.SUPER_ADMIN)
        .map((role) => ({ role, permissions: BUILT_IN_PLATFORM_PERMISSIONS[role] })),
    };
  }

  findAll() {
    return this.repo.findAll();
  }

  async findById(id: string) {
    const role = await this.repo.findById(id);
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async create(dto: CreateCompanyRoleDto, createdBy: string) {
    if (await this.repo.nameTaken(dto.name)) {
      throw new ConflictException(`A role named '${dto.name}' already exists`);
    }
    this.assertHasPermissions(dto.permissions);
    return this.repo.create({
      id: generateId(),
      name: dto.name,
      description: dto.description,
      permissions: dto.permissions,
      created_by: createdBy,
    });
  }

  async update(id: string, dto: UpdateCompanyRoleDto) {
    await this.findById(id);
    if (dto.name && (await this.repo.nameTaken(dto.name, id))) {
      throw new ConflictException(`A role named '${dto.name}' already exists`);
    }
    if (dto.permissions) this.assertHasPermissions(dto.permissions);
    const updated = await this.repo.update(id, dto);
    await this.access.invalidateAll();
    return updated;
  }

  async remove(id: string) {
    const role = await this.findById(id);
    const members = await this.repo.countMembers(id);
    if (members > 0) {
      throw new BadRequestException(
        `${members} team member(s) still have the '${role.name}' role — give them another role first`,
      );
    }
    await this.repo.delete(id);
  }

  private assertHasPermissions(permissions: string[]) {
    if (!permissions.length) {
      throw new BadRequestException('Select at least one permission for this role');
    }
  }
}
