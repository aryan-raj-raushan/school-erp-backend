import { Body, Controller, Get, Post, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNumber, IsString, ValidateNested } from 'class-validator';
import { Public } from '../../common/decorators/public.decorator';
import { GetSchoolId } from '../../common/decorators/school-id.decorator';
import { RfidService } from './rfid.service';

class RfidScanDto {
  @IsString() r: string;
  @IsString() d: string;
  @IsNumber() t1: number;
}

class RfidWebhookDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RfidScanDto)
  ses: RfidScanDto[];
}

class AssignRfidDto {
  @IsString() rfidCardId: string;
  @IsEnum(['staff', 'student']) personType: 'staff' | 'student';
  @IsString() personId: string;
}

class UnassignRfidDto {
  @IsEnum(['staff', 'student']) personType: 'staff' | 'student';
  @IsString() personId: string;
}

@ApiTags('RFID')
@Controller('rfid')
export class RfidController {
  constructor(private readonly rfidService: RfidService) {}

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive RFID card scan from device — no auth required' })
  async receive(@Body() body: RfidWebhookDto) {
    if (body?.ses?.length) {
      await this.rfidService.handleScans(body.ses);
    }
    return { ok: true };
  }

  @Get('events')
  @ApiOperation({ summary: 'Get recent card tap events enriched with person info' })
  async events(@GetSchoolId() schoolId: string) {
    return { events: await this.rfidService.getEnrichedEvents(schoolId) };
  }

  @Get('search')
  @ApiOperation({ summary: 'Search staff or students by name for RFID assignment' })
  async search(
    @GetSchoolId() schoolId: string,
    @Query('q') q: string,
    @Query('type') type: 'staff' | 'student' | 'all' = 'all',
  ) {
    return { persons: await this.rfidService.searchPersons(q ?? '', type, schoolId) };
  }

  @Post('assign')
  @ApiOperation({ summary: 'Assign RFID card to a staff member or student' })
  async assign(@GetSchoolId() schoolId: string, @Body() body: AssignRfidDto) {
    await this.rfidService.assignCard(body.rfidCardId, body.personType, body.personId, schoolId);
    return { ok: true };
  }

  @Post('unassign')
  @ApiOperation({ summary: 'Remove RFID card assignment from a staff member or student' })
  async unassign(@GetSchoolId() schoolId: string, @Body() body: UnassignRfidDto) {
    await this.rfidService.unassignCard(body.personType, body.personId, schoolId);
    return { ok: true };
  }
}
