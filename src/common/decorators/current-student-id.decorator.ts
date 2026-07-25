import { createParamDecorator, ExecutionContext, ForbiddenException } from '@nestjs/common';

export const GetCurrentStudentId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const studentId = request.user?.student_id;
    if (!studentId) {
      throw new ForbiddenException('No student context on this session');
    }
    return studentId;
  },
);
