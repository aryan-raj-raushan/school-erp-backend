/**
 * Cleanup script:
 * 1. Delete duplicate per-class seed subjects (COM1/2, DRW1/2, etc.)
 * 2. Create canonical subjects (EVS, Science, Social Studies, Drawing, Computer, GK)
 * 3. Map ALL canonical subjects to Classes 1-4 via subject_classes
 * 4. Soft-delete duplicate Class 2 (e5b67940 — 0 students/exams)
 * 5. Create missing "Unit test 1 1" exam for Class 2 (fixes auto-shuffle sibling detection)
 * 6. Flush Redis sitting/subject/exam keys
 */
const { Client } = require('pg');
const { randomUUID } = require('crypto');
require('dotenv').config();

const SCHOOL_ID = '3634b65e-16d0-4bfb-a018-70e8ccf6f989';
const YEAR_ID   = '92f82564-23d5-439b-82d0-9d7f6ae9d160';

const CLASS1 = 'd4aafe42-4cf1-4f4f-84cd-5e09c0116e9f';
const CLASS2 = 'd6a1c982-5361-4b59-9d7d-107ce2b001f8';
const CLASS3 = '5b1908d4-4524-40e7-b200-916aa57530bd';
const CLASS4 = '68ee101b-c802-41fc-80af-f08c336b8c85';
const ALL_CLASSES = [CLASS1, CLASS2, CLASS3, CLASS4];

// Duplicate Class 2 with 0 students/exams
const DUP_CLASS2 = 'e5b67940-a3d9-4715-8a18-69128217c683';

// Subjects to DELETE (seed-created per-class duplicates, not in exam_schedules)
const SEED_SUBJECTS_TO_DELETE = [
  '551410b7-2694-4822-8992-021d648defaa', // Computer COM2
  '1337e5b9-16a7-4ce0-8f0c-21636513a45f', // Computer COM1
  '1a392035-3599-42d3-aad4-3c3fd9762064', // Drawing DRW1
  '8cfbbfe5-5080-4e43-a01e-f3458dc882eb', // Drawing DRW2
  '1dd18510-c6bb-4361-8c89-99d709950bd6', // EVS EVS1
  '393b0b28-0e08-4fd2-adc0-0d026073be1f', // EVS EVS2
  'a40ff09a-4420-4313-9c2a-b1d01f4aeadd', // English ENG2
  'e14a39c0-bc13-41ab-829e-8cbe2569133f', // General Knowledge GK2
  '297701a4-89bf-44ae-aa0d-638f885b1d87', // Hindi HIN2
  'c8a1423c-6958-469e-b8ec-c1b005e0c641', // Science SCI1
  'fb680af6-f11d-4b27-9d17-286130df9ef0', // Science SCI2
  'a2b01320-52b9-49b2-bb66-cfdb345068c2', // Social Studies SST1
];

// Existing canonical subjects (in subject_classes already)
const CANONICAL_EXISTING = [
  { id: '1652fd24-a5a1-4aaf-9dfb-b14395b2da5a', name: 'English',     code: 'ENG'  },
  { id: '2118c0c9-7442-41bf-ac04-8687d55d7b39', name: 'Hindi',       code: 'HIN'  },
  { id: '00f13c18-fdb3-4929-b608-aab8525841d7', name: 'Mathematics', code: 'MAT2' },
  { id: '3651606c-d36f-4543-b649-17f36b51e8f4', name: 'Maths',       code: 'MAT'  }, // in exam_schedules — keep but map
];

// New canonical subjects to CREATE
const NEW_SUBJECTS = [
  { name: 'EVS',              code: 'EVS'  },
  { name: 'Science',          code: 'SCI'  },
  { name: 'Social Studies',   code: 'SST'  },
  { name: 'Drawing',          code: 'DRW'  },
  { name: 'Computer',         code: 'COM'  },
  { name: 'General Knowledge',code: 'GK'   },
];

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // ── 1. Verify seed subjects not in exam_schedules ──────────────────────────
    console.log('\n=== Verifying safe to delete ===');
    const schedRes = await client.query(
      `SELECT DISTINCT subject_id FROM exam_schedules WHERE school_id = $1 AND deleted = false`,
      [SCHOOL_ID],
    );
    const scheduledIds = new Set(schedRes.rows.map(r => r.subject_id));
    for (const id of SEED_SUBJECTS_TO_DELETE) {
      if (scheduledIds.has(id)) {
        console.error(`  SKIP DELETE: ${id} is referenced in exam_schedules!`);
        SEED_SUBJECTS_TO_DELETE.splice(SEED_SUBJECTS_TO_DELETE.indexOf(id), 1);
      }
    }
    console.log(`  ${SEED_SUBJECTS_TO_DELETE.length} subjects safe to delete`);

    // ── 2. Soft-delete seed duplicate subjects ─────────────────────────────────
    console.log('\n=== Deleting seed duplicate subjects ===');
    if (SEED_SUBJECTS_TO_DELETE.length > 0) {
      await client.query(
        `UPDATE subjects SET deleted = true, updated_at = NOW() WHERE id = ANY($1) AND school_id = $2`,
        [SEED_SUBJECTS_TO_DELETE, SCHOOL_ID],
      );
      // Also remove any subject_classes entries for these
      await client.query(
        `DELETE FROM subject_classes WHERE subject_id = ANY($1)`,
        [SEED_SUBJECTS_TO_DELETE],
      );
      console.log(`  Deleted ${SEED_SUBJECTS_TO_DELETE.length} duplicate subjects`);
    }

    // ── 3. Create new canonical subjects ──────────────────────────────────────
    console.log('\n=== Creating canonical subjects ===');
    const newSubjectIds = [];
    for (const s of NEW_SUBJECTS) {
      // Check if already exists (name match, not deleted)
      const existing = await client.query(
        `SELECT id FROM subjects WHERE school_id = $1 AND name = $2 AND deleted = false`,
        [SCHOOL_ID, s.name],
      );
      if (existing.rows.length > 0) {
        console.log(`  Skip "${s.name}" (already exists: ${existing.rows[0].id})`);
        newSubjectIds.push(existing.rows[0].id);
      } else {
        const id = randomUUID();
        await client.query(
          `INSERT INTO subjects (id, school_id, class_id, name, code, is_elective, is_active, deleted, created_at)
           VALUES ($1, $2, $3, $4, $5, false, true, false, NOW())`,
          [id, SCHOOL_ID, CLASS1, s.name, s.code],
        );
        newSubjectIds.push(id);
        console.log(`  + "${s.name}" (${s.code}) → ${id}`);
      }
    }

    // ── 4. Map ALL canonical subjects to all 4 classes via subject_classes ─────
    console.log('\n=== Mapping subjects to Classes 1-4 ===');
    const allCanonical = [
      ...CANONICAL_EXISTING.map(s => s.id),
      ...newSubjectIds,
    ];

    for (const subjectId of allCanonical) {
      for (const classId of ALL_CLASSES) {
        // Check if mapping already exists
        const exists = await client.query(
          `SELECT id FROM subject_classes WHERE subject_id = $1 AND class_id = $2`,
          [subjectId, classId],
        );
        if (exists.rows.length === 0) {
          await client.query(
            `INSERT INTO subject_classes (id, subject_id, class_id, created_at)
             VALUES ($1, $2, $3, NOW())`,
            [randomUUID(), subjectId, classId],
          );
          console.log(`  + ${subjectId.slice(0,8)} → class ${classId.slice(0,8)}`);
        }
      }
    }
    console.log('  Done mapping');

    // ── 5. Soft-delete duplicate Class 2 ──────────────────────────────────────
    console.log('\n=== Soft-deleting duplicate Class 2 ===');
    const dupCheck = await client.query(
      `SELECT COUNT(*) as cnt FROM student_academic_info WHERE class_id = $1 AND deleted = false`,
      [DUP_CLASS2],
    );
    if (parseInt(dupCheck.rows[0].cnt) > 0) {
      console.log(`  SKIP: duplicate Class 2 has ${dupCheck.rows[0].cnt} students`);
    } else {
      await client.query(
        `UPDATE classes SET deleted = true, updated_at = NOW() WHERE id = $1`,
        [DUP_CLASS2],
      );
      console.log('  Soft-deleted duplicate Class 2 (e5b67940)');
    }

    // ── 6. Fix auto-shuffle: create "Unit test 1 1" exam for Class 2 ──────────
    console.log('\n=== Creating missing exam for Class 2 ===');
    const existingC2Exam = await client.query(
      `SELECT id FROM exams WHERE school_id = $1 AND exam_name = 'Unit test 1 1' AND class_id = $2 AND deleted = false`,
      [SCHOOL_ID, CLASS2],
    );
    if (existingC2Exam.rows.length > 0) {
      console.log(`  Already exists: ${existingC2Exam.rows[0].id}`);
    } else {
      // Fetch the source exam to copy fields
      const src = await client.query(
        `SELECT * FROM exams WHERE school_id = $1 AND exam_name = 'Unit test 1 1' AND class_id = $2 AND deleted = false`,
        [SCHOOL_ID, CLASS1],
      );
      if (src.rows.length === 0) {
        console.log('  Source exam "Unit test 1 1" for Class 1 not found — skipping');
      } else {
        const s = src.rows[0];
        const newId = randomUUID();
        await client.query(
          `INSERT INTO exams (id, school_id, academic_year_id, class_id, exam_name, exam_term, start_date, end_date,
            include_in_marks, is_enabled, deleted, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false, NOW())`,
          [newId, SCHOOL_ID, s.academic_year_id, CLASS2, s.exam_name, s.exam_term,
           s.start_date, s.end_date, s.include_in_marks, s.is_enabled],
        );
        console.log(`  + Created "Unit test 1 1" for Class 2: ${newId}`);
      }
    }

    console.log('\n✓ DB cleanup complete');
    console.log('\nIMPORTANT: Flush Redis manually or restart the backend to clear cached data.');
    console.log('Run: node scripts/flush-redis.js');
  } catch (err) {
    console.error('Script failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
