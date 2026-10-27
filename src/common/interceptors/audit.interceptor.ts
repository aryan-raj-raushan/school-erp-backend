import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLogsService } from '../../modules/audit-logs/audit-logs.service';
import { AuthContext } from '../../shared/enums';

const MUTATING_METHODS = ['POST', 'PATCH', 'PUT', 'DELETE'];

type AuditableEntity =
  | 'FEES'
  | 'FINANCE'
  | 'SALARY'
  | 'SCHOOL'
  | 'SUBSCRIPTION'
  | 'SUBSCRIPTION_PLAN'
  | 'COMPANY_USER'
  | 'INVOICE'
  | 'PAYMENT';

// URL segment -> audit_entity enum value. Deliberately scoped to entities not
// already logged directly by their own module (e.g. 'exam' calls
// AuditLogsService itself) to avoid duplicate audit rows for the same action.
const ENTITY_MAP: Record<string, AuditableEntity> = {
  fees: 'FEES',
  finance: 'FINANCE',
  salary: 'SALARY',
};

const PLATFORM_ENTITY_MAP: Record<string, AuditableEntity> = {
  schools: 'SCHOOL',
  subscriptions: 'SUBSCRIPTION',
  'subscription-plans': 'SUBSCRIPTION_PLAN',
  'company-users': 'COMPANY_USER',
  invoices: 'INVOICE',
  payments: 'PAYMENT',
};

const SECRET_KEY_PATTERN = /password|credential|token|secret/i;

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly auditLogs: AuditLogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();

    if (!MUTATING_METHODS.includes(request.method)) {
      return next.handle();
    }

    const user = request.user;
    if (!user) return next.handle();

    const isPlatformRequest = user.context === AuthContext.COMPANY;
    // audit_logs.school_id is a real FK to schools.id — school-context rows always
    // carry the caller's school; platform rows carry the affected school when known.
    if (!isPlatformRequest && (user.context !== AuthContext.SCHOOL || !user.school_id)) {
      return next.handle();
    }

    const entity = this.extractEntity(
      request.url,
      isPlatformRequest ? PLATFORM_ENTITY_MAP : ENTITY_MAP,
    );
    if (!entity) return next.handle();

    return next.handle().pipe(
      tap({
        next: (responseData) => {
          const action = this.httpMethodToAction(request.method);
          const data = (responseData as { data?: Record<string, unknown> })?.data;
          const entityId = request.params?.id ?? (data?.id as string | undefined);
          // entity_id is NOT NULL — skip logging rather than guess (e.g. bulk
          // operations with no single affected id).
          if (!entityId) return;

          const schoolId = isPlatformRequest
            ? ((data?.school_id as string | undefined) ??
              (entity === 'SCHOOL' ? String(entityId) : null))
            : user.school_id;

          void this.auditLogs
            .log({
              school_id: schoolId,
              entity,
              entity_id: String(entityId),
              action,
              changed_by: user.sub,
              ip_address: request.ip,
              new_value: action !== 'DELETE' ? this.withoutSecrets(data) : undefined,
            })
            .catch((error: Error) =>
              this.logger.warn(
                `Audit log write failed for ${entity} ${entityId}: ${error.message}`,
              ),
            );
        },
      }),
    );
  }

  private withoutSecrets(
    data: Record<string, unknown> | undefined,
  ): Record<string, unknown> | undefined {
    if (!data) return undefined;
    return Object.fromEntries(
      Object.entries(data).filter(([key]) => !SECRET_KEY_PATTERN.test(key)),
    );
  }

  private extractEntity(
    url: string,
    map: Record<string, AuditableEntity>,
  ): AuditableEntity | undefined {
    const parts = url.split('?')[0].split('/').filter(Boolean);
    const apiIdx = parts.indexOf('v1');
    const segment = apiIdx >= 0 ? parts[apiIdx + 1] : parts[0];
    return segment ? map[segment] : undefined;
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
