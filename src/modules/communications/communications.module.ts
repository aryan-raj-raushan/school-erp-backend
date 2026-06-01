import { Module } from '@nestjs/common';
import { NotificationsController, CommunicationController } from './communications.controller';
import { CommunicationsService } from './communications.service';
import { CommunicationsRepository } from './communications.repository';

@Module({
  controllers: [NotificationsController, CommunicationController],
  providers: [CommunicationsService, CommunicationsRepository],
  exports: [CommunicationsService, CommunicationsRepository],
})
export class CommunicationsModule {}
