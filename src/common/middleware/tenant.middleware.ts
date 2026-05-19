import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request & { tenantId?: string }, _res: Response, next: NextFunction): void {
    const user = (req as Request & { user?: Record<string, string> }).user;
    if (user?.school_id) {
      req.tenantId = user.school_id;
    }
    next();
  }
}
