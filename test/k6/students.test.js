import http from 'k6/http';
import { check, sleep } from 'k6';
import { loadOptions } from './config/options.js';
import { getSchoolAuthToken, authHeaders, randomName, randomAdmissionNumber } from './config/helpers.js';

export const options = loadOptions;

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';
const CLASS_ID = __ENV.TEST_CLASS_ID || '';
const ACADEMIC_YEAR_ID = __ENV.TEST_ACADEMIC_YEAR_ID || '';

export function setup() {
  return { token: getSchoolAuthToken(BASE_URL) };
}

export default function (data) {
  const headers = authHeaders(data.token);

  // List students
  const listRes = http.get(`${BASE_URL}/students?page=1&limit=20`, { headers });
  check(listRes, {
    'list 200': (r) => r.status === 200,
    'list has items': (r) => JSON.parse(r.body)?.data?.items !== undefined,
    'list p95 < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(0.5);

  // Create student
  const createRes = http.post(
    `${BASE_URL}/students`,
    JSON.stringify({
      first_name: randomName('Ravi'),
      last_name: 'Test',
      admission_number: randomAdmissionNumber(),
      class_id: CLASS_ID,
      academic_year_id: ACADEMIC_YEAR_ID,
    }),
    { headers },
  );
  check(createRes, {
    'create 201': (r) => r.status === 201,
    'create p95 < 600ms': (r) => r.timings.duration < 600,
  });

  const studentId = JSON.parse(createRes.body)?.data?.id;

  sleep(0.5);

  if (studentId) {
    // Get single
    const getRes = http.get(`${BASE_URL}/students/${studentId}`, { headers });
    check(getRes, {
      'get 200': (r) => r.status === 200,
      'get p95 < 300ms': (r) => r.timings.duration < 300,
    });

    sleep(0.3);

    // Update
    const updateRes = http.patch(
      `${BASE_URL}/students/${studentId}`,
      JSON.stringify({ first_name: randomName('Updated') }),
      { headers },
    );
    check(updateRes, { 'update 200': (r) => r.status === 200 });

    sleep(0.3);

    // Delete
    const deleteRes = http.del(`${BASE_URL}/students/${studentId}`, null, { headers });
    check(deleteRes, { 'delete 200': (r) => r.status === 200 });
  }

  sleep(1);
}
