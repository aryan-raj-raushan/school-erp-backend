const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name varchar(255) PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const { rows } = await client.query('SELECT name FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.name));
    const pending = fs
      .readdirSync(__dirname)
      .filter((f) => f.endsWith('.sql') && !applied.has(f))
      .sort();

    if (pending.length === 0) {
      console.log('migrations: nothing to apply');
      return;
    }

    for (const file of pending) {
      const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`migrations: applied ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`migrations: ${file} failed — ${error.message}`);
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
