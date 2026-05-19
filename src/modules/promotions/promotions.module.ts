import { Module } from '@nestjs/common';
import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';
import { PromotionsRepository } from './promotions.repository';
import { DrizzleModule } from '../../database/drizzle/drizzle.module';

@Module({
  imports: [DrizzleModule],
  controllers: [PromotionsController],
  providers: [PromotionsService, PromotionsRepository],
  exports: [PromotionsService],
})
export class PromotionsModule {}
