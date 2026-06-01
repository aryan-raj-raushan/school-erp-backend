import { Module } from '@nestjs/common';
import { ParentsController } from './parents.controller';
import { ParentsService } from './parents.service';
import { ParentsRepository } from './parents.repository';

@Module({
  controllers: [ParentsController],
  providers: [ParentsService, ParentsRepository],
  exports: [ParentsService, ParentsRepository],
})
export class ParentsModule {}
