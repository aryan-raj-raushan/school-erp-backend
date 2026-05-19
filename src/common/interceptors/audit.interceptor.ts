import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLog, AuditLogDocument } from '../../database/mongo/schemas/audit-log.schema';
import { AuthContext } from '../../shared/enums';

const MUTATING_METHODS = ['POST', 'PATCH', 'PUT', 'DELETE'];

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();

    if (!MUTATING_METHODS.includes(request.method)) {
      return next.handle();
    }

    const user = request.user;
    if (!user) return next.handle();

    return next.handle().pipe(
      tap({
        next: (responseData) => {
          const entity = this.extractEntity(request.url);
          const action = this.httpMethodToAction(request.method);
          const entityId =
            request.params?.id ||
            (responseData as Record<string, unknown>)?.id ||
            (responseData as Record<string, unknown>)?.data?.id;

          void this.auditLogModel.create({
            school_id:
              user.context === AuthContext.SCHOOL
                ? user.school_id
                : (request.body?.school_id ?? 'COMPANY'),
            user_id: user.sub,
            user_role: user.role,
            action,
            entity,
            entity_id: entityId ? String(entityId) : undefined,
            after_state:
              action !== 'DELETE' ? (responseData as Record<string, unknown>)?.data : undefined,
            metadata: {
              ip_address: request.ip,
              user_agent: request.get('user-agent'),
              endpoint: request.url,
              http_method: request.method,
            },
            created_at: new Date(),
          });
        },
      }),
    );
  }

  private extractEntity(url: string): string {
    const parts = url.split('/').filter(Boolean);
    const apiIdx = parts.indexOf('v1');
    return apiIdx >= 0 && parts[apiIdx + 1] ? parts[apiIdx + 1] : 'unknown';
  }

  private httpMethodToAction(method: string): string {
    const map: Record<string, string> = {
      POST: 'CREATE',
      PATCH: 'UPDATE',
      PUT: 'UPDATE',
      DELETE: 'DELETE',
    };
    return map[method] ?? 'UNKNOWN';
  }
}
