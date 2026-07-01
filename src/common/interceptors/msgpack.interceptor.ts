import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { encode } from '@msgpack/msgpack';
import { Request, Response } from 'express';

@Injectable()
export class MsgpackInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const wantsMsgpack = request.headers['accept'] === 'application/msgpack';
    const isMultipart = (request.headers['content-type'] ?? '').startsWith('multipart/');

    if (!wantsMsgpack || isMultipart) {
      return next.handle();
    }

    return next.handle().pipe(
      switchMap((data) => {
        // If headers already sent (e.g., file export), skip msgpack encoding
        if (response.headersSent) {
          return of(null);
        }
        // Write binary directly — returning Buffer from map() causes NestJS to JSON.stringify it
        // as {"type":"Buffer","data":[...]} which breaks msgpack decode on the client.
        // Return of(null): isNil(null)=true → NestJS calls res.send() with no body → no-op on
        // already-ended response. EMPTY would throw EmptyError via lastValueFrom → crash.
        response.setHeader('Content-Type', 'application/msgpack');
        response.end(Buffer.from(encode(data)));
        return of(null);
      }),
    );
  }
}
