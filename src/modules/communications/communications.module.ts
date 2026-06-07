import { Module } from '@nestjs/common';
import { NotificationsController, CommunicationController } from './communications.controller';
import { CommunicationsService } from './communications.service';
import { CommunicationsRepository } from './communications.repository';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [NotificationsController, CommunicationController],
  providers: [CommunicationsService, CommunicationsRepository],
  exports: [CommunicationsService, CommunicationsRepository],
})
export class CommunicationsModule {}
