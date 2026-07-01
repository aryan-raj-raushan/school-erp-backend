import { Module } from '@nestjs/common';
import { ClassSubjectTeacherController } from './class-subject-teacher.controller';
import { ClassSubjectTeacherService } from './class-subject-teacher.service';
import { ClassSubjectTeacherRepository } from './class-subject-teacher.repository';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [ClassSubjectTeacherController],
  providers: [ClassSubjectTeacherService, ClassSubjectTeacherRepository],
  exports: [ClassSubjectTeacherService, ClassSubjectTeacherRepository],
})
export class ClassSubjectTeacherModule {}
