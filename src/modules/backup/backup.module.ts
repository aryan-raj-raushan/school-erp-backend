import { Module } from '@nestjs/common';
import { BackupController } from './backup.controller';
import { BackupService } from './backup.service';
import { BackupRepository } from './backup.repository';

@Module({
  controllers: [BackupController],
  providers: [BackupService, BackupRepository],
})
export class BackupModule {}
