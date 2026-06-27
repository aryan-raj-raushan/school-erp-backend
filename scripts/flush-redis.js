/**
 * Flush all exam, subject, and student Redis keys for the school.
 * Run after DB cleanup: node scripts/flush-redis.js
 */
const Redis = require('ioredis');
require('dotenv').config();

const PREFIX = process.env.REDIS_KEY_PREFIX ?? 'erp:';
const SCHOOL_ID = '3634b65e-16d0-4bfb-a018-70e8ccf6f989';

async function main() {
  const redis = new Redis({
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT ?? '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB ?? '0'),
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  });

  const patterns = [
    `${PREFIX}exam:*`,
    `${PREFIX}subjects:*`,
    `${PREFIX}students:*`,
    `${PREFIX}sitting:*`,
    `${PREFIX}classes:*`,
  ];

  let totalDeleted = 0;

  for (const pattern of patterns) {
    let cursor = '0';
    const keysToDelete = [];
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
      cursor = nextCursor;
      keysToDelete.push(...keys);
    } while (cursor !== '0');

    if (keysToDelete.length > 0) {
      await redis.del(...keysToDelete);
      console.log(`  Deleted ${keysToDelete.length} keys matching "${pattern}"`);
      totalDeleted += keysToDelete.length;
    } else {
      console.log(`  No keys for "${pattern}"`);
    }
  }

  console.log(`\n✓ Redis flush complete — ${totalDeleted} keys deleted`);
  await redis.quit();
}

main().catch(err => { console.error('Redis flush failed:', err.message); process.exit(1); });
