import { Module } from '@nestjs/common';
import { StudentMovementsController } from './student-movements.controller';
import { StudentMovementsService } from './student-movements.service';
import { StudentMovementsRepository } from './student-movements.repository';
import { DrizzleModule } from '../../database/drizzle/drizzle.module';

@Module({
  imports: [DrizzleModule],
  controllers: [StudentMovementsController],
  providers: [StudentMovementsService, StudentMovementsRepository],
  exports: [StudentMovementsService],
})
export class StudentMovementsModule {}
