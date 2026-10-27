import { HttpStatus } from '@nestjs/common';

const DATABASE_ERROR_STATUS: Record<string, { statusCode: HttpStatus; message: string }> = {
  '23505': { statusCode: HttpStatus.CONFLICT, message: 'Record already exists' },
  '23503': {
    statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    message: 'Referenced record does not exist',
  },
  '23502': { statusCode: HttpStatus.BAD_REQUEST, message: 'Required field is missing' },
};

export function databaseErrorStatus(
  error: unknown,
): { statusCode: HttpStatus; message: string } | undefined {
  const code = (error as { code?: string } | null)?.code;
  return code ? DATABASE_ERROR_STATUS[code] : undefined;
}
