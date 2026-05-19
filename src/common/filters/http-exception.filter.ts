import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

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

    response.status(statusCode).json({
      success: false,
      statusCode,
      message,
      errors,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
