import { Module } from '@nestjs/common';
import { EarlyExitsController } from './early-exits.controller';
import { EarlyExitsService } from './early-exits.service';
import { EarlyExitsRepository } from './early-exits.repository';

@Module({
  controllers: [EarlyExitsController],
  providers: [EarlyExitsService, EarlyExitsRepository],
  exports: [EarlyExitsService],
})
export class EarlyExitsModule {}
