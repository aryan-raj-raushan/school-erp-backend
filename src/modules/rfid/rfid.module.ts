import { Module } from '@nestjs/common';
import { RfidController } from './rfid.controller';
import { RfidService } from './rfid.service';
import { RfidRepository } from './rfid.repository';
import { DrizzleModule } from '../../database/drizzle/drizzle.module';

@Module({
  imports: [DrizzleModule],
  controllers: [RfidController],
  providers: [RfidService, RfidRepository],
})
export class RfidModule {}
