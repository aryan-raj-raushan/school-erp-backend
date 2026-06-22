import { Injectable } from '@nestjs/common';
import { PermissionsService } from '../permissions/permissions.service';
import { SearchRepository } from './search.repository';
import { RedisService } from '../redis/redis.service';
import { CacheTTL } from '../../shared/constants';
import { GlobalSearchResult } from './types/search.types';

@Injectable()
export class SearchService {
  constructor(
    private readonly searchRepo: SearchRepository,
    private readonly permissionsService: PermissionsService,
    private readonly redisService: RedisService,
  ) {}

  async globalSearch(
    query: string,
    schoolId: string,
    userId: string,
    customRoleId: string | null | undefined,
    enumRoleSlug: string,
  ): Promise<GlobalSearchResult> {
    const perms = await this.permissionsService.resolveUserPermissions(
      userId,
      schoolId,
      customRoleId,
      enumRoleSlug,
    );

    // Normalise query: trim + lowercase so "John" and "john" share same cache entry
    const normalisedQuery = query.trim().toLowerCase();
    const permsKey = [...perms].sort().join(',');
    const cacheKey = `search:${schoolId}:${normalisedQuery}:${permsKey}`;

    return this.redisService.getOrSet(cacheKey, CacheTTL.SHORT, () =>
      this.searchRepo.searchAll(query, schoolId, perms),
    );
  }
}
