import { Module } from '@nestjs/common';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';
import { StudentsRepository } from './students.repository';
import { DrizzleModule } from '../../database/drizzle/drizzle.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [DrizzleModule, RedisModule],
  controllers: [StudentsController],
  providers: [StudentsService, StudentsRepository],
  exports: [StudentsService, StudentsRepository],
})
export class StudentsModule {}