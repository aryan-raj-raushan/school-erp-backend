import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLogsService } from '../../modules/audit-logs/audit-logs.service';
import { AuthContext } from '../../shared/enums';

const MUTATING_METHODS = ['POST', 'PATCH', 'PUT', 'DELETE'];

type AuditableEntity = 'FEES' | 'FINANCE' | 'SALARY';

// URL segment -> audit_entity enum value. Deliberately scoped to entities not
// already logged directly by their own module (e.g. 'exam' calls
// AuditLogsService itself) to avoid duplicate audit rows for the same action.
const ENTITY_MAP: Record<string, AuditableEntity> = {
  fees: 'FEES',
  finance: 'FINANCE',
  salary: 'SALARY',
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditLogs: AuditLogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();

    if (!MUTATING_METHODS.includes(request.method)) {
      return next.handle();
    }

    const entity = this.extractEntity(request.url);
    if (!entity) return next.handle();

    const user = request.user;
    // audit_logs.school_id is a real FK to schools.id — only log for school-
    // context users, rather than risk a constraint violation for company/
    // platform-level requests that have no valid school id.
    if (!user || user.context !== AuthContext.SCHOOL || !user.school_id) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: (responseData) => {
          const action = this.httpMethodToAction(request.method);
          const data = (responseData as { data?: Record<string, unknown> })?.data;
          const entityId = request.params?.id ?? (data?.id as string | undefined);
          // entity_id is NOT NULL — skip logging rather than guess (e.g. bulk
          // operations with no single affected id).
          if (!entityId) return;

          void this.auditLogs
            .log({
              school_id: user.school_id,
              entity,
              entity_id: String(entityId),
              action,
              changed_by: user.sub,
              new_value: action !== 'DELETE' ? data : undefined,
            })
            .catch(() => {});
        },
      }),
    );
  }

  private extractEntity(url: string): AuditableEntity | undefined {
    const parts = url.split('/').filter(Boolean);
    const apiIdx = parts.indexOf('v1');
    const segment = apiIdx >= 0 ? parts[apiIdx + 1] : parts[0];
    return segment ? ENTITY_MAP[segment] : undefined;
  }

  private httpMethodToAction(method: string): 'CREATE' | 'UPDATE' | 'DELETE' {
    const map: Record<string, 'CREATE' | 'UPDATE' | 'DELETE'> = {
      POST: 'CREATE',
      PATCH: 'UPDATE',
      PUT: 'UPDATE',
      DELETE: 'DELETE',
    };
    return map[method] ?? 'UPDATE';
  }
}
