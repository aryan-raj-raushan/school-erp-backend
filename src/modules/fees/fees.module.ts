import { Module } from '@nestjs/common';
import { FeesController } from './fees.controller';
import { FeesService } from './fees.service';
import { FeesRepository } from './fees.repository';
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [FinanceModule],
  controllers: [FeesController],
  providers: [FeesService, FeesRepository],
  exports: [FeesService, FeesRepository],
})
export class FeesModule {}
