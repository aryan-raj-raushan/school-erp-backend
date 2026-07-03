#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

const SQL_STATEMENTS = [
  `CREATE TYPE applies_to AS ENUM ('STUDENTS', 'STAFF', 'BOTH')`,
  `ALTER TABLE school_events ADD COLUMN applies_to applies_to DEFAULT 'BOTH' NOT NULL`,
  `ALTER TABLE school_events ADD COLUMN exempt_role_ids JSONB DEFAULT '[]' NOT NULL`,
];

async function migrate() {
  try {
    console.log('🔄 Connecting to database...');
    await client.connect();
    console.log('✅ Connected\n');

    for (const sql of SQL_STATEMENTS) {
      try {
        console.log(`⏳ Executing: ${sql.substring(0, 60)}...`);
        await client.query(sql);
        console.log('✅ Success\n');
      } catch (err) {
        if (err.code === '42710' || err.message.includes('already exists')) {
          console.log('⚠️  Already exists, skipping\n');
        } else {
          throw err;
        }
      }
    }

    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Migration failed:');
    console.error('Error:', err.message);
    if (err.detail) console.error('Detail:', err.detail);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
