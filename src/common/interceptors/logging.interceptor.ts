import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') ?? '';
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const duration = Date.now() - start;
          this.logger.log(
            `${method} ${url} ${response.statusCode} ${duration}ms — ${ip} ${userAgent}`,
          );
        },
        error: (error: Error) => {
          const duration = Date.now() - start;
          this.logger.error(`${method} ${url} ERROR ${duration}ms — ${error.message}`);
        },
      }),
    );
  }
}
