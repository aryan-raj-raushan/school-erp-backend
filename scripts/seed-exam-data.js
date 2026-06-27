/**
 * Seed script: adds realistic students and subjects for exam module testing.
 * Run from backend root: node scripts/seed-exam-data.js
 */
const { Client } = require('pg');
const { randomUUID } = require('crypto');
require('dotenv').config();

const SCHOOL_ID = '3634b65e-16d0-4bfb-a018-70e8ccf6f989';
const YEAR_ID   = '92f82564-23d5-439b-82d0-9d7f6ae9d160';
const CLASS1_ID = 'd4aafe42-4cf1-4f4f-84cd-5e09c0116e9f';
const CLASS2_ID = 'd6a1c982-5361-4b59-9d7d-107ce2b001f8';

// ── Student data ──────────────────────────────────────────────────────────────
const CLASS1_STUDENTS = [
  { first: 'Aarav',    last: 'Sharma',   adm: 'C1A004' },
  { first: 'Ananya',   last: 'Verma',    adm: 'C1A005' },
  { first: 'Chirag',   last: 'Patel',    adm: 'C1A006' },
  { first: 'Diya',     last: 'Nair',     adm: 'C1A007' },
  { first: 'Harsh',    last: 'Agarwal',  adm: 'C1A008' },
  { first: 'Ishaan',   last: 'Gupta',    adm: 'C1A009' },
  { first: 'Kavya',    last: 'Joshi',    adm: 'C1A010' },
  { first: 'Manav',    last: 'Singh',    adm: 'C1A011' },
  { first: 'Nidhi',    last: 'Rao',      adm: 'C1A012' },
  { first: 'Parth',    last: 'Mehta',    adm: 'C1A013' },
  { first: 'Rashi',    last: 'Kapoor',   adm: 'C1A014' },
  { first: 'Samar',    last: 'Pandey',   adm: 'C1A015' },
];

const CLASS2_STUDENTS = [
  { first: 'Aakriti',  last: 'Tripathi', adm: 'C2A006' },
  { first: 'Arnav',    last: 'Mishra',   adm: 'C2A007' },
  { first: 'Deepika',  last: 'Sinha',    adm: 'C2A008' },
  { first: 'Gautam',   last: 'Yadav',    adm: 'C2A009' },
  { first: 'Hina',     last: 'Khan',     adm: 'C2A010' },
  { first: 'Jai',      last: 'Prakash',  adm: 'C2A011' },
  { first: 'Kritika',  last: 'Saxena',   adm: 'C2A012' },
  { first: 'Lakshmi',  last: 'Devi',     adm: 'C2A013' },
  { first: 'Mohit',    last: 'Bhat',     adm: 'C2A014' },
  { first: 'Neha',     last: 'Rastogi',  adm: 'C2A015' },
];

// ── Subject data ──────────────────────────────────────────────────────────────
const CLASS1_SUBJECTS = [
  { name: 'EVS',              code: 'EVS1' },
  { name: 'Science',          code: 'SCI1' },
  { name: 'Social Studies',   code: 'SST1' },
  { name: 'Drawing',          code: 'DRW1' },
  { name: 'Computer',         code: 'COM1' },
];

const CLASS2_SUBJECTS = [
  { name: 'English',          code: 'ENG2' },
  { name: 'Hindi',            code: 'HIN2' },
  { name: 'Mathematics',      code: 'MAT2' },
  { name: 'EVS',              code: 'EVS2' },
  { name: 'Science',          code: 'SCI2' },
  { name: 'Drawing',          code: 'DRW2' },
  { name: 'Computer',         code: 'COM2' },
  { name: 'General Knowledge',code: 'GK2'  },
];

async function seedStudents(client, classId, students) {
  // Check existing admission numbers to avoid duplicates
  const existingRes = await client.query(
    `SELECT admission_number FROM student_academic_info WHERE class_id = $1`,
    [classId],
  );
  const existing = new Set(existingRes.rows.map(r => r.admission_number));

  let added = 0;
  for (const s of students) {
    if (existing.has(s.adm)) {
      console.log(`  Skip ${s.adm} (already exists)`);
      continue;
    }
    const studentId = randomUUID();
    const saiId     = randomUUID();

    await client.query(
      `INSERT INTO students (id, school_id, first_name, last_name, status, is_enabled, deleted, created_at)
       VALUES ($1, $2, $3, $4, 'ACTIVE', true, false, NOW())`,
      [studentId, SCHOOL_ID, s.first, s.last],
    );

    await client.query(
      `INSERT INTO student_academic_info (id, school_id, student_id, academic_year_id, class_id, admission_number, is_current, deleted, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, true, false, NOW())`,
      [saiId, SCHOOL_ID, studentId, YEAR_ID, classId, s.adm],
    );

    console.log(`  + ${s.first} ${s.last} (${s.adm})`);
    added++;
  }
  return added;
}

async function seedSubjects(client, classId, subjects) {
  const existingRes = await client.query(
    `SELECT name FROM subjects WHERE class_id = $1 AND school_id = $2`,
    [classId, SCHOOL_ID],
  );
  const existing = new Set(existingRes.rows.map(r => r.name.toLowerCase()));

  let added = 0;
  for (const s of subjects) {
    if (existing.has(s.name.toLowerCase())) {
      console.log(`  Skip subject "${s.name}" (already exists)`);
      continue;
    }
    const id = randomUUID();
    await client.query(
      `INSERT INTO subjects (id, school_id, class_id, name, code, is_elective, is_active, deleted, created_at)
       VALUES ($1, $2, $3, $4, $5, false, true, false, NOW())`,
      [id, SCHOOL_ID, classId, s.name, s.code],
    );
    console.log(`  + subject "${s.name}" (${s.code})`);
    added++;
  }
  return added;
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    console.log('\n=== Seeding Class 1 students ===');
    const c1s = await seedStudents(client, CLASS1_ID, CLASS1_STUDENTS);
    console.log(`  → ${c1s} added\n`);

    console.log('=== Seeding Class 2 students ===');
    const c2s = await seedStudents(client, CLASS2_ID, CLASS2_STUDENTS);
    console.log(`  → ${c2s} added\n`);

    console.log('=== Seeding Class 1 subjects ===');
    const c1sub = await seedSubjects(client, CLASS1_ID, CLASS1_SUBJECTS);
    console.log(`  → ${c1sub} added\n`);

    console.log('=== Seeding Class 2 subjects ===');
    const c2sub = await seedSubjects(client, CLASS2_ID, CLASS2_SUBJECTS);
    console.log(`  → ${c2sub} added\n`);

    console.log('✓ Seed complete');
  } finally {
    await client.end();
  }
}

main().catch(err => { console.error('Seed failed:', err.message); process.exit(1); });
