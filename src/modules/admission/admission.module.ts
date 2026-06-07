import { Module } from '@nestjs/common';
import { AdmissionSourcesController } from './admission-sources.controller';
import { AdmissionSourcesService } from './admission-sources.service';
import { AdmissionSourcesRepository } from './admission-sources.repository';
import { AdmissionEnquiriesController } from './admission-enquiries.controller';
import { AdmissionEnquiriesService } from './admission-enquiries.service';
import { AdmissionEnquiriesRepository } from './admission-enquiries.repository';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [AdmissionSourcesController, AdmissionEnquiriesController],
  providers: [
    AdmissionSourcesService, AdmissionSourcesRepository,
    AdmissionEnquiriesService, AdmissionEnquiriesRepository,
  ],
  exports: [AdmissionEnquiriesService, AdmissionSourcesService],
})
export class AdmissionModule {}