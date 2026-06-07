import { Module } from '@nestjs/common';
import { SyllabiController } from './syllabi.controller';
import { SyllabiService } from './syllabi.service';
import { SyllabiRepository } from './syllabi.repository';

@Module({
  controllers: [SyllabiController],
  providers: [SyllabiService, SyllabiRepository],
  exports: [SyllabiService, SyllabiRepository],
})
export class SyllabiModule {}
