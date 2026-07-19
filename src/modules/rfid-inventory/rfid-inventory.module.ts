import { Module } from '@nestjs/common';
import { RfidInventoryController } from './rfid-inventory.controller';
import { RfidInventoryService } from './rfid-inventory.service';
import { RfidInventoryRepository } from './rfid-inventory.repository';

@Module({
  controllers: [RfidInventoryController],
  providers: [RfidInventoryService, RfidInventoryRepository],
  exports: [RfidInventoryService],
})
export class RfidInventoryModule {}
