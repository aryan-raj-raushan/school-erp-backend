import http from 'k6/http';
import { check, sleep } from 'k6';
import { loadOptions } from './config/options.js';
import { getAuthToken, authHeaders, randomName } from './config/helpers.js';

export const options = loadOptions;

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';

export function setup() {
  return { token: getAuthToken(BASE_URL) };
}

export default function (data) {
  const headers = authHeaders(data.token);

  // List schools
  const listRes = http.get(`${BASE_URL}/schools?page=1&limit=20`, { headers });
  check(listRes, {
    'list 200': (r) => r.status === 200,
    'list success': (r) => JSON.parse(r.body)?.success === true,
    'list p95 < 400ms': (r) => r.timings.duration < 400,
  });

  sleep(0.5);

  // Create school
  const createRes = http.post(
    `${BASE_URL}/schools`,
    JSON.stringify({
      name: randomName('Test School'),
      code: `TST${Date.now()}`.slice(0, 10),
      board_type: 'CBSE',
      address: '123 Test Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      contact_email: `school_${Date.now()}@test.com`,
      contact_phone: '9876543210',
    }),
    { headers },
  );
  check(createRes, {
    'create 201': (r) => r.status === 201,
    'create p95 < 600ms': (r) => r.timings.duration < 600,
  });

  const schoolId = JSON.parse(createRes.body)?.data?.id;

  sleep(0.5);

  if (schoolId) {
    // Get single
    const getRes = http.get(`${BASE_URL}/schools/${schoolId}`, { headers });
    check(getRes, {
      'get 200': (r) => r.status === 200,
      'get p95 < 300ms': (r) => r.timings.duration < 300,
    });

    sleep(0.3);

    // Search
    const searchRes = http.get(`${BASE_URL}/schools?search=Test&page=1&limit=10`, { headers });
    check(searchRes, { 'search 200': (r) => r.status === 200 });
  }

  sleep(1);
}
