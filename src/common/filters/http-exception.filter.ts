import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { encode } from '@msgpack/msgpack';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: Record<string, string> | string[] | undefined;
    let extra: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        const body = exceptionResponse as Record<string, unknown>;
        message = (body.message as string) ?? message;
        errors = body.errors as Record<string, string> | string[] | undefined;

        if (Array.isArray(body.message)) {
          errors = body.message as string[];
          message = 'Validation failed';
        }

        // Preserve any additional structured payload (e.g. `conflicts`,
        // `incomplete_schedule_ids`) beyond the standard fields, so callers
        // that throw `new BadRequestException({ message, ...extra })` don't
        // have that extra context silently dropped.
        const { message: _m, errors: _e, statusCode: _s, error: _err, ...rest } = body;
        if (Object.keys(rest).length > 0) extra = rest;
      } else {
        message = exceptionResponse as string;
      }
    } else if (exception instanceof Error) {
      const pgError = exception as Error & { code?: string; detail?: string };

      if (pgError.code === '23505') {
        statusCode = HttpStatus.CONFLICT;
        message = 'Record already exists';
      } else if (pgError.code === '23503') {
        statusCode = HttpStatus.UNPROCESSABLE_ENTITY;
        message = 'Referenced record does not exist';
      } else if (pgError.code === '23502') {
        statusCode = HttpStatus.BAD_REQUEST;
        message = 'Required field is missing';
      } else {
        this.logger.error(
          `Unhandled exception: ${exception.message}`,
          exception.stack,
          'GlobalExceptionFilter',
        );
      }
    }

    const body = {
      success: false,
      statusCode,
      message,
      errors,
      ...extra,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // If headers already sent, don't try to send error response
    if (response.headersSent) {
      return;
    }

    if (request.headers['accept'] === 'application/msgpack') {
      response
        .status(statusCode)
        .set('Content-Type', 'application/msgpack')
        .end(Buffer.from(encode(body)));
    } else {
      response.status(statusCode).json(body);
    }
  }
}
