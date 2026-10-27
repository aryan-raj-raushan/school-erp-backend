import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  Inject,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { sql, SQL } from 'drizzle-orm';
import { DRIZZLE_ORM } from '../../database/drizzle/drizzle.constants';
import { DrizzleDB } from '../../database/drizzle/drizzle.provider';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { REGEX } from '../../utils/regex.utils';

const MUTATING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];
// Year management enforces its own rules; promotions intentionally move students out of a frozen year.
const EXEMPT_PATHS = ['/academic-years', '/promotions'];
const MAX_IDS_CHECKED = 50;

/**
 * A frozen academic year is read-only. Any write that references the year, or a
 * record belonging to it (class, section, exam, attendance, fee bill, ...) through a
 * route param or a top-level body/query value, is rejected. The set of year-scoped
 * tables is read from the database catalog so new tables are covered automatically.
 */
@Injectable()
export class FrozenAcademicYearGuard implements CanActivate {
  private readonly logger = new Logger(FrozenAcademicYearGuard.name);
  private yearScopedTables?: Promise<string[]>;

  constructor(
    private readonly reflector: Reflector,
    @Inject(DRIZZLE_ORM) private readonly db: DrizzleDB,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    if (!MUTATING_METHODS.includes(request.method)) return true;
    const path = String(request.url).split('?')[0];
    if (EXEMPT_PATHS.some((p) => path.includes(p))) return true;

    const ids = FrozenAcademicYearGuard.collectIds(request);
    if (ids.length === 0) return true;

    const frozenYear = await this.findFrozenYear(ids).catch((error: Error) => {
      // Never let this check take every write down — log it and let the request through.
      this.logger.error(`Frozen-year check failed: ${error.message}`);
      this.yearScopedTables = undefined;
      return null;
    });
    if (frozenYear) {
      throw new BadRequestException(
        `Academic year '${frozenYear}' is frozen — unfreeze it before making changes`,
      );
    }
    return true;
  }

  private static collectIds(request: {
    params?: Record<string, unknown>;
    query?: Record<string, unknown>;
    body?: unknown;
  }): string[] {
    const body = (request.body && typeof request.body === 'object' ? request.body : {}) as Record<
      string,
      unknown
    >;
    const academicInfo = body.academic_info as Record<string, unknown> | undefined;
    const values = [
      ...Object.values(request.params ?? {}),
      ...Object.values(request.query ?? {}),
      ...Object.values(body),
      academicInfo?.academic_year_id,
    ];
    const ids = values.filter((v): v is string => typeof v === 'string' && REGEX.UUID_V4.test(v));
    return [...new Set(ids)].slice(0, MAX_IDS_CHECKED);
  }

  private loadYearScopedTables(): Promise<string[]> {
    this.yearScopedTables ??= this.db
      .execute(
        sql`select c.table_name from information_schema.columns c
            where c.table_schema = 'public' and c.column_name = 'academic_year_id'
              and exists (select 1 from information_schema.columns i
                          where i.table_schema = 'public' and i.table_name = c.table_name
                            and i.column_name = 'id')`,
      )
      .then((result) => result.rows.map((r) => String((r as { table_name: string }).table_name)));
    return this.yearScopedTables;
  }

  private async findFrozenYear(ids: string[]): Promise<string | null> {
    const idArray = sql`${`{${ids.join(',')}}`}::text[]`;
    const sources: SQL[] = [
      sql`select id::text as academic_year_id from academic_years where id::text = any(${idArray})`,
      sql`select c.academic_year_id::text from sections s join classes c on c.id = s.class_id where s.id::text = any(${idArray})`,
      ...(await this.loadYearScopedTables()).map(
        (table) =>
          sql`select academic_year_id::text from ${sql.identifier(table)} where id::text = any(${idArray})`,
      ),
    ];
    const result = await this.db.execute(
      sql`select ay.name from academic_years ay
          where ay.is_frozen and ay.id::text in (select academic_year_id from (${sql.join(sources, sql` union all `)}) refs)
          limit 1`,
    );
    const row = result.rows[0] as { name: string } | undefined;
    return row?.name ?? null;
  }
}
