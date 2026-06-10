#!/usr/bin/env node
// Architecture enforcement checker.
// Rules:
//   Controller: no repository imports, no schema imports, no Drizzle queries, no DRIZZLE_ORM
//   Service: no DRIZZLE_ORM injection, no DrizzleDB reference, no inline TTL constants
//   All non-test TS files: no hardcoded UUID string literals
//   Services with find/get/list methods: must inject RedisService

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');
const DRIZZLE_QUERY_METHODS = /this\.db\.(select|insert|update|delete)\(/;
const HARDCODED_UUID = /["'][0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}["']/i;
const INLINE_TTL = /^const\s+\w*TTL\w*\s*=\s*\d+/m;
const RAW_REGEXP = /new RegExp\(/;

let failures = 0;
let warnings = 0;

function fail(file, line, msg) {
  const rel = path.relative(SRC_DIR, file);
  console.error(`\x1b[31m[FAIL]\x1b[0m ${rel}:${line} — ${msg}`);
  failures++;
}

function warn(file, msg) {
  const rel = path.relative(SRC_DIR, file);
  console.warn(`\x1b[33m[WARN]\x1b[0m ${rel} — ${msg}`);
  warnings++;
}

function getLines(content) {
  return content.split('\n');
}

function findLineNumber(lines, pattern) {
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) return i + 1;
  }
  return 1;
}

function scanFiles(dir, callback) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // skip dist, node_modules
      if (['node_modules', 'dist', '.git'].includes(entry.name)) continue;
      scanFiles(full, callback);
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      callback(full);
    }
  }
}

scanFiles(SRC_DIR, (file) => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = getLines(content);
  const isTest = file.endsWith('.spec.ts') || file.endsWith('.e2e-spec.ts');
  const isUtil = file.endsWith('.utils.ts');
  const baseName = path.basename(file);

  // ── Controller checks ────────────────────────────────────────────────────
  // health.controller.ts is infrastructure and legitimately uses direct DB for readiness checks
  if (baseName.endsWith('.controller.ts') && baseName !== 'health.controller.ts') {
    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      // no repository imports
      if (/import\s+.*Repository/.test(line) && !/\/\/ arch-ignore/.test(line)) {
        fail(file, lineNum, 'Controller must not import a Repository — use Service instead');
      }
      // no direct schema imports
      if (/from\s+['"].*database\/drizzle\/schema/.test(line)) {
        fail(file, lineNum, 'Controller must not import DB schema directly');
      }
      // no DRIZZLE_ORM token
      if (/DRIZZLE_ORM/.test(line)) {
        fail(file, lineNum, 'Controller must not use DRIZZLE_ORM injection token');
      }
      // no raw drizzle query methods (shouldn't have this.db anyway)
      if (DRIZZLE_QUERY_METHODS.test(line)) {
        fail(file, lineNum, 'Controller must not run Drizzle queries — use Service/Repository');
      }
    });
  }

  // ── Service checks ────────────────────────────────────────────────────────
  if (baseName.endsWith('.service.ts') && baseName !== 'redis.service.ts') {
    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      // no direct DB injection
      if (/@Inject\(DRIZZLE_ORM\)/.test(line)) {
        fail(file, lineNum, 'Service must not inject DRIZZLE_ORM — use a Repository');
      }
      // no DrizzleDB type held as field
      if (/private\s+readonly\s+\w+:\s*DrizzleDB/.test(line)) {
        fail(file, lineNum, 'Service must not hold a DrizzleDB reference — use a Repository');
      }
      // no raw Drizzle queries
      if (DRIZZLE_QUERY_METHODS.test(line)) {
        fail(file, lineNum, 'Service must not run Drizzle queries — delegate to Repository');
      }
      // no inline TTL constants — must come from @shared/constants
      if (/^const\s+\w*TTL\w*\s*=\s*[\d*\s+]+[;\s]/.test(line)) {
        fail(file, lineNum, 'Inline TTL constant — import CacheTTL/AuthTTL/JobTTL from @shared/constants instead');
      }
    });

    // Services with find/get/list async methods must inject and use RedisService
    const hasFindOrGet = /async\s+(find|get|list)\w*\s*\(/.test(content);
    const hasRedis = /RedisService/.test(content);
    if (hasFindOrGet && !hasRedis) {
      fail(file, 1, 'Service has find/get/list methods but no RedisService injection — every GET must use Redis cache');
    }
  }

  // ── Repository checks ─────────────────────────────────────────────────────
  if (baseName.endsWith('.repository.ts')) {
    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      // repositories must NOT import RedisService (that belongs in service layer)
      if (/import.*RedisService/.test(line)) {
        fail(file, lineNum, 'Repository must not use RedisService — caching belongs in Service layer');
      }
    });
  }

  // ── All non-test files: hardcoded UUIDs ────────────────────────────────────
  if (!isTest) {
    lines.forEach((line, idx) => {
      if (HARDCODED_UUID.test(line) && !/\/\/ arch-ignore/.test(line)) {
        fail(file, idx + 1, 'Hardcoded UUID literal — extract to a const in a constants file');
      }
    });
  }

  // ── Non-util files: raw RegExp constructor ─────────────────────────────────
  if (!isTest && !isUtil) {
    lines.forEach((line, idx) => {
      if (RAW_REGEXP.test(line) && !/\/\/ arch-ignore/.test(line)) {
        warn(file, `Line ${idx + 1}: raw \`new RegExp()\` — prefer REGEX constants from @utils/regex.utils`);
      }
    });
  }
});

console.log('');
if (failures > 0) {
  console.error(`\x1b[31m✖ Architecture check failed: ${failures} violation(s), ${warnings} warning(s)\x1b[0m`);
  process.exit(1);
} else if (warnings > 0) {
  console.warn(`\x1b[33m⚠ Architecture check passed with ${warnings} warning(s)\x1b[0m`);
} else {
  console.log(`\x1b[32m✔ Architecture check passed\x1b[0m`);
}
