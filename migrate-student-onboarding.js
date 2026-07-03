#!/usr/bin/env node

require('dotenv').config();

const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

const SQL_STATEMENTS = [
  `ALTER TYPE enquiry_status ADD VALUE IF NOT EXISTS 'ONBOARDING_IN_PROGRESS'`,
  `ALTER TABLE students ADD COLUMN admission_enquiry_id VARCHAR(36) REFERENCES admission_enquiries(id) ON DELETE SET NULL`,
  `CREATE INDEX students_admission_enquiry_id_idx ON students (admission_enquiry_id)`,
];

async function migrate() {
  try {
    console.log('🔄 Connecting to database...');
    await client.connect();
    console.log('✅ Connected\n');

    for (const sql of SQL_STATEMENTS) {
      try {
        console.log(`⏳ Executing: ${sql.substring(0, 80)}...`);
        await client.query(sql);
        console.log('✅ Success\n');
      } catch (err) {
        if (err.code === '42710' || err.code === '42701' || err.message.includes('already exists')) {
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
