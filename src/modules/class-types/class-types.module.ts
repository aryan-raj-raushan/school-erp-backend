import { Module } from '@nestjs/common';
import { ClassTypesController } from './class-types.controller';
import { ClassTypesService } from './class-types.service';
import { ClassTypesRepository } from './class-types.repository';

@Module({
  controllers: [ClassTypesController],
  providers: [ClassTypesService, ClassTypesRepository],
  exports: [ClassTypesService, ClassTypesRepository],
})
export class ClassTypesModule {}
