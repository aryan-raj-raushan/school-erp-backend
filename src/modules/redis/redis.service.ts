import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

interface L1Entry<T> {
  data: T;
  expiresAt: number;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private readonly logger = new Logger(RedisService.name);

  // L1 in-memory cache — eliminates Upstash round-trip for hot data
  // TTL is short (process-local, no cross-instance sync needed for ERP scale)
  private readonly l1Cache = new Map<string, L1Entry<unknown>>();
  private static readonly L1_TTL_MS = 30_000; // 30s — permissions + frequent GETs

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const config = this.configService.get('redis');
    const tls = process.env.REDIS_TLS === 'true' ? { rejectUnauthorized: false } : undefined;
    this.client = new Redis({
      host: config.host,
      port: config.port,
      password: config.password || undefined,
      db: config.db,
      keyPrefix: config.keyPrefix,
      tls,
      retryStrategy: (times) => Math.min(times * 50, 2000),
      lazyConnect: true,
    });

    this.client.on('error', (err) => this.logger.error('Redis error', err));
    this.client.on('connect', () => this.logger.log('Redis connected'));
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  getClient(): Redis {
    return this.client;
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string): Promise<'OK'> {
    return this.client.set(key, value);
  }

  async setex(key: string, ttlSeconds: number, value: string): Promise<'OK'> {
    return this.client.setex(key, ttlSeconds, value);
  }

  async setnx(key: string, value: string): Promise<number> {
    return this.client.setnx(key, value);
  }

  async expire(key: string, ttlSeconds: number): Promise<number> {
    return this.client.expire(key, ttlSeconds);
  }

  async del(...keys: string[]): Promise<number> {
    keys.forEach((k) => this.l1Cache.delete(k));
    return this.client.del(...keys);
  }

  async exists(key: string): Promise<number> {
    return this.client.exists(key);
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    return this.client.sadd(key, ...members);
  }

  async smembers(key: string): Promise<string[]> {
    return this.client.smembers(key);
  }

  async sismember(key: string, member: string): Promise<number> {
    return this.client.sismember(key, member);
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    return this.client.srem(key, ...members);
  }

  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  /**
   * Scans all keys matching pattern, parses each stored { data, cachedAt } envelope,
   * and returns a deduplicated flat array of T items.
   * Returns null when no keys exist (caller should fall back to DB).
   * Handles both plain-array data and PaginationResponse { items: T[] } shapes.
   */
  async getValuesByPattern<T extends { id: string }>(pattern: string): Promise<T[] | null> {
    const prefix = this.configService.get<string>('redis.keyPrefix') ?? '';
    let cursor = '0';
    const appKeys: string[] = [];
    do {
      const [next, found] = await this.client.scan(
        cursor,
        'MATCH',
        `${prefix}${pattern}`,
        'COUNT',
        100,
      );
      cursor = next;
      appKeys.push(...found.map((k) => (k.startsWith(prefix) ? k.slice(prefix.length) : k)));
    } while (cursor !== '0');

    if (appKeys.length === 0) return null;

    const pipeline = this.client.pipeline();
    appKeys.forEach((k) => pipeline.get(k));
    const results = (await pipeline.exec()) ?? [];

    const items: T[] = [];
    for (const [, raw] of results) {
      if (!raw) continue;
      try {
        const { data } = JSON.parse(raw as string) as { data: unknown };
        if (Array.isArray(data)) {
          items.push(...(data as T[]));
        } else if (
          data &&
          typeof data === 'object' &&
          'items' in data &&
          Array.isArray((data as Record<string, unknown>).items)
        ) {
          items.push(...((data as Record<string, unknown>).items as T[]));
        }
      } catch {
        /* skip corrupt entries */
      }
    }

    const seen = new Set<string>();
    return items.filter((item) => {
      if (!item.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }

  async delByPattern(pattern: string): Promise<void> {
    this.l1Invalidate(pattern);

    const prefix: string = this.configService.get('redis.keyPrefix') || '';
    let cursor = '0';
    const toDelete: string[] = [];
    do {
      const [next, keys] = await this.client.scan(
        cursor,
        'MATCH',
        `${prefix}${pattern}`,
        'COUNT',
        100,
      );
      cursor = next;
      toDelete.push(...keys.map((k) => (k.startsWith(prefix) ? k.slice(prefix.length) : k)));
    } while (cursor !== '0');
    if (toDelete.length) {
      const pipeline = this.client.pipeline();
      toDelete.forEach((k) => pipeline.del(k));
      await pipeline.exec();
    }
  }

  private static readonly CACHE_ABSOLUTE_TTL = 60 * 60 * 24 * 30; // 30 days — automatic cleanup for inactive schools

  private setCacheEntry(key: string, data: unknown): Promise<'OK'> {
    return this.client.set(
      key,
      JSON.stringify({ data, cachedAt: Date.now() }),
      'EX',
      RedisService.CACHE_ABSOLUTE_TTL,
    );
  }

  private l1Get<T>(key: string): T | undefined {
    const entry = this.l1Cache.get(key) as L1Entry<T> | undefined;
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.l1Cache.delete(key);
      return undefined;
    }
    return entry.data;
  }

  private l1Set<T>(key: string, data: T): void {
    this.l1Cache.set(key, { data, expiresAt: Date.now() + RedisService.L1_TTL_MS });
  }

  l1Invalidate(pattern: string): void {
    // Convert glob pattern to regex: split on * and check all literal parts are present in order
    const parts = pattern.split('*').filter(Boolean);
    for (const k of this.l1Cache.keys()) {
      let pos = 0;
      const matched = parts.every((p) => {
        const idx = k.indexOf(p, pos);
        if (idx === -1) return false;
        pos = idx + p.length;
        return true;
      });
      if (matched) this.l1Cache.delete(k);
    }
  }

  async getOrSet<T>(key: string, ttlSeconds: number, factory: () => Promise<T>): Promise<T> {
    // L1 check — zero network, ~0ms
    const l1Hit = this.l1Get<T>(key);
    if (l1Hit !== undefined) {
      this.logger.debug(`L1 HIT      [${key}]`);
      return l1Hit;
    }

    const start = Date.now();
    const raw = await this.client.get(key);

    if (raw) {
      const { data, cachedAt } = JSON.parse(raw) as { data: T; cachedAt: number };
      const age = Date.now() - cachedAt;
      const staleAfterMs = ttlSeconds * 1000;

      if (age > staleAfterMs) {
        // STALE — serve immediately, refresh in background (one worker via lock)
        const lock = `cache_refresh_lock:${key}`;
        const got = await this.client.set(lock, '1', 'EX', 30, 'NX');
        if (got) {
          this.logger.debug(`CACHE STALE [${key}] age=${Math.round(age / 1000)}s — bg refresh`);
          factory()
            .then((v) => this.setCacheEntry(key, v))
            .catch((e) => this.logger.warn(`BG refresh failed [${key}]: ${e}`))
            .finally(() => this.client.del(lock));
        }
      } else {
        this.logger.debug(
          `CACHE HIT   [${key}] age=${Math.round(age / 1000)}s  ${Date.now() - start}ms`,
        );
      }
      this.l1Set(key, data);
      return data;
    }

    // TRUE MISS — only 1 request hits DB; others poll until cache ready
    const buildLock = `cache_build_lock:${key}`;
    const got = await this.client.set(buildLock, '1', 'EX', 30, 'NX');

    if (got) {
      try {
        const dbStart = Date.now();
        const value = await factory();
        this.logger.debug(
          `CACHE MISS  [${key}] db=${Date.now() - dbStart}ms total=${Date.now() - start}ms`,
        );
        await this.setCacheEntry(key, value);
        this.l1Set(key, value);
        return value;
      } finally {
        await this.client.del(buildLock);
      }
    }

    // Another request holds build lock — poll until cache populated (max 5s)
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 50));
      const ready = await this.client.get(key);
      if (ready) {
        this.logger.debug(`CACHE WAIT  [${key}] resolved in ${Date.now() - start}ms`);
        const data = (JSON.parse(ready) as { data: T }).data;
        this.l1Set(key, data);
        return data;
      }
    }

    // Lock holder crashed — fallback to DB directly
    this.logger.warn(`CACHE WAIT timeout [${key}] — fallback to DB`);
    const value = await factory();
    await this.setCacheEntry(key, value);
    this.l1Set(key, value);
    return value;
  }
}
