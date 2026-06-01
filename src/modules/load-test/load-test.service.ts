import { Injectable } from '@nestjs/common';
import { OpenAPIObject } from '@nestjs/swagger';

// ─── Auto-detection rules ─────────────────────────────────────────────────────

/**
 * Tags whose endpoints require company (SUPER_ADMIN) token.
 * All other authenticated tags default to school token.
 * New tags follow this automatically — update here only when a new
 * company-level feature area is introduced.
 */
const COMPANY_AUTH_TAGS = new Set(['Schools', 'Subscriptions', 'Load Test']);

/**
 * Path segments that mark an endpoint as always-skip for write operations.
 * Matched against the full path using includes().
 * New auth/meta endpoints are caught automatically via pattern — extend here
 * only for non-obvious cases.
 */
const SKIP_WRITE_PATTERNS = [
  '/auth/company/login',
  '/auth/school/login',
  '/auth/company/register',
  '/auth/refresh',
  '/auth/logout',
  '/auth/me',
  '/load-test',
  '/promotions/students',
];

type Method = 'get' | 'post' | 'patch' | 'delete';

interface EndpointEntry {
  path: string;
  method: Method;
  tag: string;
  pathParams: string[];
  needsAuth: boolean;
  authContext: 'school' | 'company' | 'none';
  allow404: boolean;
  smokeOnly: boolean;
  body: Record<string, unknown> | null;
  paramSources: Record<string, string>;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class LoadTestService {
  private document: OpenAPIObject | null = null;

  setDocument(doc: OpenAPIObject) {
    this.document = doc;
  }

  generate(scenario: 'smoke' | 'full' = 'smoke'): string {
    if (!this.document) return '// Swagger document not loaded';

    const paths = this.document.paths || {};
    const allPaths = new Set(Object.keys(paths));
    const groups: Record<string, EndpointEntry[]> = {};
    const METHODS: Method[] = ['get', 'post', 'patch', 'delete'];

    for (const [epPath, methods] of Object.entries(paths)) {
      const m = methods as Record<string, any>;

      for (const method of METHODS) {
        if (!m[method]) continue;

        const info = m[method];
        const k6meta = info['x-k6'] ?? {};

        // skip — explicit or auto-detected
        if (k6meta.skip) continue;
        if (method !== 'get' && this.shouldSkipWrite(epPath)) continue;
        if (method === 'delete' && scenario === 'full') continue;

        const tag: string = (info.tags?.[0] as string) ?? 'Other';
        const pathParams: string[] = ((info.parameters ?? []) as any[])
          .filter((p: any) => p.in === 'path')
          .map((p: any) => p.name as string);

        const authContext: 'school' | 'company' | 'none' =
          k6meta.authContext ??
          this.inferAuthContext(epPath, tag, info);

        const allow404: boolean =
          k6meta.allow404 ??
          this.inferAllow404(info);

        const smokeOnly: boolean =
          k6meta.smokeOnly ??
          (method === 'delete');

        const body = (method === 'post' || method === 'patch')
          ? this.buildSampleBody(info.requestBody)
          : null;

        if (!groups[tag]) groups[tag] = [];
        groups[tag].push({
          path: epPath,
          method,
          tag,
          pathParams,
          needsAuth: authContext !== 'none',
          authContext,
          allow404,
          smokeOnly,
          body,
          paramSources: k6meta.paramSources ?? {},
        });
      }
    }

    return this.renderScript(groups, allPaths, scenario);
  }

  // ─── Auto-detection ──────────────────────────────────────────────────────────

  private shouldSkipWrite(epPath: string): boolean {
    return SKIP_WRITE_PATTERNS.some((p) => epPath.includes(p));
  }

  private inferAuthContext(
    epPath: string,
    tag: string,
    info: any,
  ): 'school' | 'company' | 'none' {
    const hasSecurity = Array.isArray(info.security) ? info.security.length > 0 : true;
    if (!hasSecurity) return 'none';

    if (COMPANY_AUTH_TAGS.has(tag)) return 'company';
    return 'school';
  }

  private inferAllow404(info: any): boolean {
    const responses = info.responses ?? {};
    return '404' in responses;
  }

  /**
   * Auto-resolve which list endpoint provides the value for a path param.
   *
   * Algorithm: for param at position N in the path, the source list is the
   * path segment up to (but not including) the param token.
   *
   * Examples:
   *   /api/v1/students/{id}                    → id  from /api/v1/students
   *   /api/v1/students/{id}/parents/{parentId} → id  from /api/v1/students
   *                                            → parentId from /api/v1/students/{id}/parents
   */
  private resolveParamSource(
    epPath: string,
    paramName: string,
    allPaths: Set<string>,
    overrides: Record<string, string> = {},
  ): string | null {
    // explicit override from @K6({ paramSources: { paramName: '/api/v1/...' } })
    if (overrides[paramName]) return overrides[paramName];

    const segments = epPath.split('/');
    const paramToken = `{${paramName}}`;
    const idx = segments.indexOf(paramToken);
    if (idx === -1) return null;

    // base = all segments up to (not including) the param token
    const base = segments.slice(0, idx).join('/');
    if (allPaths.has(base)) return base;

    // try without trailing non-param segment (for set-current, cancel, etc.)
    if (idx > 1) {
      const parent = segments.slice(0, idx - 1).join('/');
      if (allPaths.has(parent)) return parent;
    }

    return null;
  }

  private pathToVar(p: string): string {
    return p
      .replace(/^\/api\/v1\//, '')
      .replace(/[{}\\/\-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  // ─── Body generation from Swagger schema ─────────────────────────────────────

  private buildSampleBody(requestBody: any): Record<string, unknown> | null {
    const schema = requestBody?.content?.['application/json']?.schema;
    if (!schema) return null;

    const props: Record<string, any> = schema.properties ?? {};
    const required: string[] = schema.required ?? [];
    const targetKeys = required.length > 0 ? required : Object.keys(props);
    const body: Record<string, unknown> = {};

    for (const key of targetKeys) {
      const prop = props[key];
      if (!prop) continue;
      if (prop.example !== undefined) { body[key] = prop.example; continue; }
      if (prop.enum?.length) { body[key] = prop.enum[0]; continue; }

      switch (prop.type) {
        case 'string':
          body[key] = prop.format === 'email' ? 'test@example.com'
            : prop.format === 'date' ? '2025-01-01'
            : prop.format === 'uri' ? 'https://example.com'
            : `test_${key}`;
          break;
        case 'number':
        case 'integer': body[key] = 1; break;
        case 'boolean': body[key] = true; break;
        case 'array':   body[key] = []; break;
        default:        body[key] = null;
      }
    }
    return Object.keys(body).length ? body : null;
  }

  // ─── Script rendering ─────────────────────────────────────────────────────────

  private renderScript(
    groups: Record<string, EndpointEntry[]>,
    allPaths: Set<string>,
    scenario: string,
  ): string {
    const lines: string[] = [];

    lines.push(`// AUTO-GENERATED by LoadTestService — do not edit manually`);
    lines.push(`// Re-generate: GET /api/v1/load-test.js`);
    lines.push(`// Generated: ${new Date().toISOString()}`);
    lines.push(`// Coverage: GET + POST + PATCH + DELETE — all new endpoints auto-included`);
    lines.push(``);
    lines.push(`import http from 'k6/http';`);
    lines.push(`import { check, group, sleep } from 'k6';`);
    lines.push(`import { Rate, Trend } from 'k6/metrics';`);
    lines.push(``);
    lines.push(`const errorRate    = new Rate('errors');`);
    lines.push(`const listLatency  = new Trend('latency_list', true);`);
    lines.push(`const authLatency  = new Trend('latency_auth', true);`);
    lines.push(`const writeLatency = new Trend('latency_write', true);`);
    lines.push(``);
    lines.push(`const BASE_URL         = __ENV.BASE_URL         || 'http://localhost:3000';`);
    lines.push(`const SCHOOL_DIAL_CODE = __ENV.SCHOOL_DIAL_CODE || '+91';`);
    lines.push(`const SCHOOL_PHONE     = __ENV.SCHOOL_PHONE     || '9999999999';`);
    lines.push(`const SCHOOL_PASSWORD  = __ENV.SCHOOL_PASSWORD  || 'Admin@1234';`);
    lines.push(`const COMPANY_EMAIL    = __ENV.COMPANY_EMAIL    || 'saurabh@erp.com';`);
    lines.push(`const COMPANY_PASSWORD = __ENV.COMPANY_PASSWORD || 'Admin@1234';`);
    lines.push(`const SCENARIO         = __ENV.K6_SCENARIO      || '${scenario}';`);
    lines.push(``);
    lines.push(`export const options = {`);
    lines.push(`  scenarios: SCENARIO === 'smoke' ? {`);
    lines.push(`    smoke: { executor: 'constant-vus', vus: 3, duration: '1m', tags: { scenario: 'smoke' } },`);
    lines.push(`  } : {`);
    lines.push(`    warmup: {`);
    lines.push(`      executor: 'ramping-vus', startVUs: 0,`);
    lines.push(`      stages: [{ duration: '30s', target: 5 }, { duration: '30s', target: 5 }, { duration: '10s', target: 0 }],`);
    lines.push(`      gracefulRampDown: '10s', tags: { scenario: 'warmup' },`);
    lines.push(`    },`);
    lines.push(`    sustained: {`);
    lines.push(`      executor: 'constant-vus', vus: 20, duration: '3m',`);
    lines.push(`      startTime: '1m20s', tags: { scenario: 'sustained' },`);
    lines.push(`    },`);
    lines.push(`    spike: {`);
    lines.push(`      executor: 'ramping-vus', startVUs: 0,`);
    lines.push(`      stages: [{ duration: '10s', target: 50 }, { duration: '30s', target: 50 }, { duration: '10s', target: 0 }],`);
    lines.push(`      startTime: '5m', tags: { scenario: 'spike' },`);
    lines.push(`    },`);
    lines.push(`  },`);
    lines.push(`  thresholds: {`);
    lines.push(`    http_req_duration: ['p(95)<2000', 'p(99)<4000'],`);
    lines.push(`    http_req_failed:   ['rate<0.20'],`);
    lines.push(`    errors:            ['rate<0.05'],`);
    lines.push(`    latency_list:      ['p(95)<2000'],`);
    lines.push(`    latency_auth:      ['p(95)<2000'],`);
    lines.push(`    latency_write:     ['p(95)<3000'],`);
    lines.push(`  },`);
    lines.push(`};`);
    lines.push(``);
    lines.push(`let vuSchoolToken   = null; let vuSchoolRefresh  = null; let vuSchoolExpiry  = 0;`);
    lines.push(`let vuCompanyToken  = null; let vuCompanyRefresh = null; let vuCompanyExpiry = 0;`);
    lines.push(``);
    lines.push(`export function setup() {`);
    lines.push(`  const sRes = http.post(\`\${BASE_URL}/api/v1/auth/school/login\`,`);
    lines.push(`    JSON.stringify({ dial_code: SCHOOL_DIAL_CODE, phone_number: SCHOOL_PHONE, password: SCHOOL_PASSWORD }),`);
    lines.push(`    { headers: { 'Content-Type': 'application/json' } });`);
    lines.push(`  const sOk = check(sRes, { 'setup: school login 200': (r) => r.status === 200 });`);
    lines.push(`  if (!sOk) console.error(\`School login failed [\${sRes.status}]: \${sRes.body}\`);`);
    lines.push(`  const sData = sOk ? JSON.parse(sRes.body).data : {};`);
    lines.push(``);
    lines.push(`  const cRes = http.post(\`\${BASE_URL}/api/v1/auth/company/login\`,`);
    lines.push(`    JSON.stringify({ email: COMPANY_EMAIL, password: COMPANY_PASSWORD }),`);
    lines.push(`    { headers: { 'Content-Type': 'application/json' } });`);
    lines.push(`  const cOk = check(cRes, { 'setup: company login 200': (r) => r.status === 200 });`);
    lines.push(`  if (!cOk) console.error(\`Company login failed [\${cRes.status}]: \${cRes.body}\`);`);
    lines.push(`  const cData = cOk ? JSON.parse(cRes.body).data : {};`);
    lines.push(``);
    lines.push(`  return {`);
    lines.push(`    schoolToken: sData.accessToken,   schoolRefresh: sData.refreshToken,   schoolExpiry:  Date.now() + 14 * 60 * 1000,`);
    lines.push(`    companyToken: cData.accessToken,  companyRefresh: cData.refreshToken,  companyExpiry: Date.now() + 14 * 60 * 1000,`);
    lines.push(`  };`);
    lines.push(`}`);
    lines.push(``);
    lines.push(`function _refresh(token, refresh, expiry) {`);
    lines.push(`  if (Date.now() < expiry - 30000) return { token, refresh, expiry };`);
    lines.push(`  const res = http.post(\`\${BASE_URL}/api/v1/auth/refresh\`, null,`);
    lines.push(`    { headers: { Authorization: \`Bearer \${refresh}\`, 'Content-Type': 'application/json' } });`);
    lines.push(`  if (res.status !== 200) return { token, refresh, expiry };`);
    lines.push(`  const b = JSON.parse(res.body).data;`);
    lines.push(`  return { token: b.accessToken, refresh: b.refreshToken, expiry: Date.now() + 14 * 60 * 1000 };`);
    lines.push(`}`);
    lines.push(``);
    lines.push(`function getSchoolToken(data) {`);
    lines.push(`  if (!vuSchoolToken) { vuSchoolToken = data.schoolToken; vuSchoolRefresh = data.schoolRefresh; vuSchoolExpiry = data.schoolExpiry; }`);
    lines.push(`  const r = _refresh(vuSchoolToken, vuSchoolRefresh, vuSchoolExpiry);`);
    lines.push(`  vuSchoolToken = r.token; vuSchoolRefresh = r.refresh; vuSchoolExpiry = r.expiry;`);
    lines.push(`  return vuSchoolToken;`);
    lines.push(`}`);
    lines.push(``);
    lines.push(`function getCompanyToken(data) {`);
    lines.push(`  if (!vuCompanyToken) { vuCompanyToken = data.companyToken; vuCompanyRefresh = data.companyRefresh; vuCompanyExpiry = data.companyExpiry; }`);
    lines.push(`  const r = _refresh(vuCompanyToken, vuCompanyRefresh, vuCompanyExpiry);`);
    lines.push(`  vuCompanyToken = r.token; vuCompanyRefresh = r.refresh; vuCompanyExpiry = r.expiry;`);
    lines.push(`  return vuCompanyToken;`);
    lines.push(`}`);
    lines.push(``);
    lines.push(`function h(token) { return { headers: { Authorization: \`Bearer \${token}\`, 'Content-Type': 'application/json' } }; }`);
    lines.push(``);
    lines.push(`export default function (data) {`);
    lines.push(`  if (!data.schoolToken && !data.companyToken) { sleep(1); return; }`);
    lines.push(`  const schoolToken  = data.schoolToken  ? getSchoolToken(data)  : null;`);
    lines.push(`  const companyToken = data.companyToken ? getCompanyToken(data) : null;`);
    lines.push(``);

    for (const [tag, endpoints] of Object.entries(groups)) {
      // Collect all ID vars needed in this group
      const idVars = new Set<string>();
      for (const ep of endpoints) {
        for (const param of ep.pathParams) {
          const src = this.resolveParamSource(ep.path, param, allPaths, ep.paramSources);
          if (src) idVars.add(this.pathToVar(src) + 'Id');
        }
      }

      lines.push(`  // ── ${tag}`);
      if (idVars.size > 0) lines.push(`  let ${[...idVars].join(', ')} = null;`);
      lines.push(`  group('${tag.toLowerCase().replace(/\s+/g, '-')}', () => {`);
      lines.push(`    let r;`);

      for (const ep of endpoints) {
        const { path: epPath, method, pathParams, needsAuth, authContext, allow404, body, paramSources } = ep;

        // Build guards for missing ID vars
        const requiredVars = pathParams
          .map(p => {
            const src = this.resolveParamSource(epPath, p, allPaths, paramSources);
            return src ? this.pathToVar(src) + 'Id' : null;
          })
          .filter(Boolean) as string[];

        const tokenExpr = authContext === 'company' ? 'companyToken' : 'schoolToken';
        const authArg = needsAuth ? `, h(${tokenExpr})` : ``;

        const checkExpr = allow404
          ? `(res) => res.status === 200 || res.status === 404`
          : method === 'post'
            ? `(res) => res.status === 200 || res.status === 201`
            : `(res) => res.status === 200`;

        let urlExpr = `\`\${BASE_URL}${epPath}\``;
        for (const param of pathParams) {
          const src = this.resolveParamSource(epPath, param, allPaths, paramSources);
          const v = src ? this.pathToVar(src) + 'Id' : param;
          urlExpr = urlExpr.replace(`{${param}}`, `\${${v}}`);
        }

        const guard = requiredVars.length > 0 ? `if (${requiredVars.join(' && ')}) ` : '';
        const bodyArg = body
          ? `, JSON.stringify(${JSON.stringify(body)})`
          : (method === 'post' || method === 'patch') ? `, null` : ``;

        const httpCall =
          method === 'delete' ? `http.del(${urlExpr}${authArg})`
          : method === 'patch' ? `http.patch(${urlExpr}${bodyArg}${authArg})`
          : method === 'post'  ? `http.post(${urlExpr}${bodyArg}${authArg})`
          :                      `http.get(${urlExpr}${authArg})`;

        const isListGet = method === 'get' && pathParams.length === 0
          && !epPath.includes('current') && !epPath.includes('/my');

        lines.push(``);
        lines.push(`    ${guard}{`);
        lines.push(`      r = ${httpCall};`);
        if (isListGet && needsAuth) lines.push(`      listLatency.add(r.timings.duration);`);
        if (tag === 'Auth')         lines.push(`      authLatency.add(r.timings.duration);`);
        if (method !== 'get')       lines.push(`      writeLatency.add(r.timings.duration);`);
        lines.push(`      check(r, { '${method.toUpperCase()} ${epPath.replace(/'/g, "\\'")}': ${checkExpr} });`);
        lines.push(`      errorRate.add(r.status >= 500);`);

        // Auto-capture ID from list GET responses for use in subsequent calls
        if (isListGet) {
          const varName = this.pathToVar(epPath) + 'Id';
          if (idVars.has(varName)) {
            lines.push(`      try { ${varName} = JSON.parse(r.body)?.data?.[0]?.id; } catch {}`);
          }
          // special case: /subscriptions/my returns object not array
          if (epPath.endsWith('/my')) {
            const varName2 = this.pathToVar(epPath.replace('/my', '')) + 'Id';
            if (idVars.has(varName2)) {
              lines.push(`      try { ${varName2} = JSON.parse(r.body)?.data?.id; } catch {}`);
            }
          }
        }

        lines.push(`    }`);
      }

      lines.push(`  });`);
      lines.push(`  sleep(0.2);`);
      lines.push(``);
    }

    lines.push(`  sleep(1);`);
    lines.push(`}`);
    lines.push(``);
    lines.push(`export function teardown(data) {`);
    lines.push(`  if (data.schoolToken)  http.post(\`\${BASE_URL}/api/v1/auth/logout\`, null, h(data.schoolToken));`);
    lines.push(`  if (data.companyToken) http.post(\`\${BASE_URL}/api/v1/auth/logout\`, null, h(data.companyToken));`);
    lines.push(`}`);

    return lines.join('\n');
  }
}
