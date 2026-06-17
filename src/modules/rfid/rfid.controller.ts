import { Body, Controller, Post, HttpCode, HttpStatus, Sse } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { Public } from '../../common/decorators/public.decorator';
import { RfidService } from './rfid.service';

class RfidWebhookDto {
  ses: { r: string; d: string; t1: number }[];
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
  @Sse('events')
  @ApiOperation({ summary: 'SSE stream — emits an event on every card tap' })
  events(): Observable<MessageEvent> {
    return this.rfidService.getEvents();
  }
}
