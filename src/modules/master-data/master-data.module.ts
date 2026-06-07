import { Module } from '@nestjs/common';
import { MasterDataController } from './master-data.controller';
import { MasterDataService } from './master-data.service';
import { MasterDataRepository } from './master-data.repository';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [MasterDataController],
  providers: [MasterDataService, MasterDataRepository],
  exports: [MasterDataService],
})
export class MasterDataModule {}
