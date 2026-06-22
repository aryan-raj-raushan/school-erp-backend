import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { SearchRepository } from './search.repository';
import { PermissionsModule } from '../permissions/permissions.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [PermissionsModule, RedisModule],
  controllers: [SearchController],
  providers: [SearchService, SearchRepository],
})
export class SearchModule {}
