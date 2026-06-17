import { Body, Controller, Get, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsString, ValidateNested } from 'class-validator';
import { Public } from '../../common/decorators/public.decorator';
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

@ApiTags('RFID')
@Controller('rfid')
export class RfidController {
  constructor(private readonly rfidService: RfidService) {}

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive RFID card scan from device — no auth required' })
  receive(@Body() body: RfidWebhookDto) {
    if (body?.ses?.length) {
      this.rfidService.handleScans(body.ses);
    }
    return { ok: true };
  }

  @Public()
  @Get('events')
  @ApiOperation({ summary: 'Get recent card tap events' })
  events() {
    return { events: this.rfidService.getEvents() };
  }
}
