import http from 'k6/http';
import { check, sleep } from 'k6';
import { loadOptions } from './config/options.js';
import { randomEmail } from './config/helpers.js';

export const options = loadOptions;

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';

const headers = { 'Content-Type': 'application/json' };

export default function () {
  // Register
  const email = randomEmail();
  const registerRes = http.post(
    `${BASE_URL}/auth/company/register`,
    JSON.stringify({ name: 'Test User', email, password: 'Test@1234', role: 'ADMIN' }),
    { headers },
  );
  check(registerRes, {
    'register 201': (r) => r.status === 201,
    'register has token': (r) => JSON.parse(r.body)?.data?.access_token !== undefined,
  });

  sleep(0.5);

  // Login
  const loginRes = http.post(
    `${BASE_URL}/auth/company/login`,
    JSON.stringify({ email, password: 'Test@1234' }),
    { headers },
  );
  check(loginRes, {
    'login 200': (r) => r.status === 200,
    'login has access_token': (r) => JSON.parse(r.body)?.data?.access_token !== undefined,
    'login p95 < 400ms': (r) => r.timings.duration < 400,
  });

  const loginBody = JSON.parse(loginRes.body);
  const accessToken = loginBody?.data?.access_token;
  const refreshToken = loginBody?.data?.refresh_token;

  sleep(0.3);

  // Get Me
  const meRes = http.get(`${BASE_URL}/auth/me`, {
    headers: { ...headers, Authorization: `Bearer ${accessToken}` },
  });
  check(meRes, {
    'me 200': (r) => r.status === 200,
    'me p95 < 200ms': (r) => r.timings.duration < 200,
  });

  sleep(0.3);

  // Refresh
  const refreshRes = http.post(
    `${BASE_URL}/auth/refresh`,
    JSON.stringify({ refresh_token: refreshToken }),
    { headers },
  );
  check(refreshRes, {
    'refresh 200': (r) => r.status === 200,
    'refresh has new token': (r) => JSON.parse(r.body)?.data?.access_token !== undefined,
  });

  sleep(0.3);

  // Logout
  const newToken = JSON.parse(refreshRes.body)?.data?.access_token;
  const logoutRes = http.post(`${BASE_URL}/auth/logout`, null, {
    headers: { ...headers, Authorization: `Bearer ${newToken}` },
  });
  check(logoutRes, { 'logout 200': (r) => r.status === 200 });

  sleep(1);
}
