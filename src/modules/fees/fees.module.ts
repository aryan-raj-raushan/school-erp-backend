import { Module } from '@nestjs/common';
import { FeesController } from './fees.controller';
import { FeesService } from './fees.service';
import { FeesRepository } from './fees.repository';

@Module({
  controllers: [FeesController],
  providers: [FeesService, FeesRepository],
  exports: [FeesService, FeesRepository],
})
export class FeesModule {}
