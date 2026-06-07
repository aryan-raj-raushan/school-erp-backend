import { Module } from '@nestjs/common';
import { ClassDetailsController } from './class-details.controller';
import { ClassDetailsService } from './class-details.service';
import { ClassDetailsRepository } from './class-details.repository';

@Module({
  controllers: [ClassDetailsController],
  providers: [ClassDetailsService, ClassDetailsRepository],
  exports: [ClassDetailsService, ClassDetailsRepository],
})
export class ClassDetailsModule {}
