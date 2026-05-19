import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';

function flattenErrors(
  errors: ValidationError[],
  parentField = '',
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const error of errors) {
    const field = parentField ? `${parentField}.${error.property}` : error.property;

    if (error.constraints) {
      result[field] = Object.values(error.constraints)[0];
    }

    if (error.children && error.children.length > 0) {
      Object.assign(result, flattenErrors(error.children, field));
    }
  }

  return result;
}

export const CustomValidationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: {
    enableImplicitConversion: true,
  },
  disableErrorMessages: false,
  validationError: {
    target: false,
    value: false,
  },
  exceptionFactory: (errors: ValidationError[]) => {
    const flatErrors = flattenErrors(errors);
    return new BadRequestException({
      message: 'Validation failed',
      errors: flatErrors,
    });
  },
});
