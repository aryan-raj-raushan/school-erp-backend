import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { CompanyRolesRepository } from './company-roles.repository';

const ACCESS_KEY = (userId: string) => `company_access:${userId}`;
const ACCESS_TTL_SECONDS = 60 * 60;

export interface CustomRoleAccess {
  role_id: string;
  role_name: string;
  permissions: string[];
}

@Injectable()
export class CompanyAccessService {
  constructor(
    private readonly repo: CompanyRolesRepository,
    private readonly redis: RedisService,
  ) {}

  async getCustomRole(userId: string): Promise<CustomRoleAccess | null> {
    const cached = await this.redis.get(ACCESS_KEY(userId));
    if (cached) return JSON.parse(cached) as CustomRoleAccess | null;
    const role = await this.repo.findUserRole(userId);
    const access = role
      ? { role_id: role.id, role_name: role.name, permissions: role.permissions }
      : null;
    await this.redis.setex(ACCESS_KEY(userId), ACCESS_TTL_SECONDS, JSON.stringify(access));
    return access;
  }

  async invalidateUser(userId: string): Promise<void> {
    await this.redis.del(ACCESS_KEY(userId));
  }

  async invalidateAll(): Promise<void> {
    await this.redis.delByPattern(ACCESS_KEY('*'));
  }
}
