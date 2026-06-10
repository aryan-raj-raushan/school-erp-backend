import { Injectable } from '@nestjs/common';
import { MasterDataRepository } from './master-data.repository';
import { RedisService } from '../redis/redis.service';
import { CacheTTL } from '../../shared/constants';

@Injectable()
export class MasterDataService {
  constructor(
    private readonly repo: MasterDataRepository,
    private readonly redisService: RedisService,
  ) {}

  async findAllSubjects() {
    const key = 'master_data:subjects';
    return this.redisService.getOrSet(key, CacheTTL.HOUR, () => this.repo.findAllSubjects());
  }
}
