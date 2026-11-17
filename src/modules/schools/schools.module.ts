import { Module } from '@nestjs/common';
import { SchoolsController } from './schools.controller';
import { SchoolsService } from './schools.service';
import { SchoolsRepository } from './schools.repository';
import { AuthRepository } from '../auth/auth.repository';
import { RolesModule } from '../roles/roles.module';
import { SchoolCreatedListener } from './events/school-created.listener';
import { MongooseModule } from '@nestjs/mongoose';
import { UploadsModule } from '../uploads/uploads.module';
import {
  NotificationLog,
  NotificationLogSchema,
} from '../../database/mongo/schemas/notification-log.schema';

@Module({
  imports: [
    RolesModule,
    UploadsModule,
    MongooseModule.forFeature([{ name: NotificationLog.name, schema: NotificationLogSchema }]),
  ],
  controllers: [SchoolsController],
  providers: [SchoolsService, SchoolsRepository, AuthRepository, SchoolCreatedListener],
  exports: [SchoolsService, SchoolsRepository],
})
export class SchoolsModule {}
