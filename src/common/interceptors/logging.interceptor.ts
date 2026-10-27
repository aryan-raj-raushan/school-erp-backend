import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  HttpException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { databaseErrorStatus } from '../filters/database-error-status';

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
          const status =
            error instanceof HttpException
              ? error.getStatus()
              : (databaseErrorStatus(error)?.statusCode ?? 500);
          const line = `${method} ${url} ${status} ${duration}ms — ${error.message}`;
          if (status >= 500) this.logger.error(line);
          else this.logger.warn(line);
        },
      }),
    );
  }
}
