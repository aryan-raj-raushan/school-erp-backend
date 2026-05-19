import http from 'k6/http';
import { check } from 'k6';

/**
 * Authenticates as a company user and returns access token.
 * Expects env vars: BASE_URL, COMPANY_EMAIL, COMPANY_PASSWORD.
 */
export function getAuthToken(baseUrl) {
  const res = http.post(
    `${baseUrl}/auth/company/login`,
    JSON.stringify({
      email: __ENV.COMPANY_EMAIL || 'admin@test.com',
      password: __ENV.COMPANY_PASSWORD || 'Test@1234',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  check(res, { 'auth login 200': (r) => r.status === 200 });

  const body = JSON.parse(res.body);
  return body?.data?.access_token ?? '';
}

/**
 * Authenticates as a school user and returns access token.
 */
export function getSchoolAuthToken(baseUrl) {
  const res = http.post(
    `${baseUrl}/auth/school/login`,
    JSON.stringify({
      dial_code: '+91',
      phone_number: __ENV.SCHOOL_PHONE || '9876543210',
      password: __ENV.SCHOOL_PASSWORD || 'Test@1234',
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  check(res, { 'school auth login 200': (r) => r.status === 200 });

  const body = JSON.parse(res.body);
  return body?.data?.access_token ?? '';
}

export function authHeaders(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export function randomPhone() {
  const prefix = ['98', '97', '96', '95', '94', '93', '91', '90', '89', '88'][
    Math.floor(Math.random() * 10)
  ];
  return prefix + String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
}

export function randomEmail() {
  return `user_${Date.now()}_${Math.floor(Math.random() * 10000)}@test.com`;
}

export function randomName(prefix = 'Student') {
  return `${prefix}_${Math.floor(Math.random() * 100000)}`;
}

export function randomAdmissionNumber() {
  return `TST/${new Date().getFullYear()}/${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`;
}
