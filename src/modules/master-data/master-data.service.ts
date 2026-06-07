import { Injectable } from '@nestjs/common';
import { MasterDataRepository } from './master-data.repository';
import { RedisService } from '../redis/redis.service';

const CACHE_TTL = 3600; // master data rarely changes — 1 hour

@Injectable()
export class MasterDataService {
  constructor(
    private readonly repo: MasterDataRepository,
    private readonly redisService: RedisService,
  ) {}

  async findAllSubjects() {
    const key = 'master_data:subjects';
    return this.redisService.getOrSet(key, CACHE_TTL, () => this.repo.findAllSubjects());
  }
}
