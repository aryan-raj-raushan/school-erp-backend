import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestUser } from '../../shared/types/jwt-payload.types';

export const GetCurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

export const GetCurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.sub;
  },
);
