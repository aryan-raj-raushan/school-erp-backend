import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private readonly logger = new Logger(RedisService.name);

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

  async delByPattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      const keysWithoutPrefix = keys.map((k) =>
        k.startsWith(this.configService.get('redis.keyPrefix') || '')
          ? k.slice((this.configService.get('redis.keyPrefix') || '').length)
          : k,
      );
      await this.client.del(...keysWithoutPrefix);
    }
  }

  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    factory: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.get(key);
    if (cached) return JSON.parse(cached) as T;

    const value = await factory();
    await this.setex(key, ttlSeconds, JSON.stringify(value));
    return value;
  }
}
