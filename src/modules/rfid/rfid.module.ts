import { Module } from '@nestjs/common';
import { RfidController } from './rfid.controller';
import { RfidService } from './rfid.service';
import { RfidRepository } from './rfid.repository';
import { DrizzleModule } from '../../database/drizzle/drizzle.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [DrizzleModule, RedisModule],
  controllers: [RfidController],
  providers: [RfidService, RfidRepository],
})
export class RfidModule {}
