import { Module } from '@nestjs/common';
import { GatePassesController } from './gate-passes.controller';
import { GatePassesService } from './gate-passes.service';
import { GatePassesRepository } from './gate-passes.repository';

@Module({
  controllers: [GatePassesController],
  providers: [GatePassesService, GatePassesRepository],
  exports: [GatePassesService],
})
export class GatePassesModule {}
