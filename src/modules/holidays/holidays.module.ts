import { Module } from '@nestjs/common';
import { HolidaysController } from './holidays.controller';
import { HolidaysService } from './holidays.service';
import { HolidaysRepository } from './holidays.repository';

@Module({
  controllers: [HolidaysController],
  providers: [HolidaysService, HolidaysRepository],
  exports: [HolidaysService, HolidaysRepository],
})
export class HolidaysModule {}
