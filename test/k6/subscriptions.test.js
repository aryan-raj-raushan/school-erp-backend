import http from 'k6/http';
import { check, sleep } from 'k6';
import { loadOptions } from './config/options.js';
import { getAuthToken, authHeaders } from './config/helpers.js';

export const options = loadOptions;

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';
const TEST_SCHOOL_ID = __ENV.TEST_SCHOOL_ID || '';

export function setup() {
  return { token: getAuthToken(BASE_URL) };
}

export default function (data) {
  const headers = authHeaders(data.token);

  // List subscriptions
  const listRes = http.get(`${BASE_URL}/subscriptions?page=1&limit=20`, { headers });
  check(listRes, {
    'list 200': (r) => r.status === 200,
    'list p95 < 400ms': (r) => r.timings.duration < 400,
  });

  sleep(0.5);

  if (!TEST_SCHOOL_ID) {
    sleep(1);
    return;
  }

  // Create subscription
  const createRes = http.post(
    `${BASE_URL}/subscriptions`,
    JSON.stringify({
      school_id: TEST_SCHOOL_ID,
      plan_name: 'Load Test Plan',
      plan_type: 'MONTHLY',
      amount: 4999,
      currency: 'INR',
    }),
    { headers },
  );
  check(createRes, {
    'create 201': (r) => r.status === 201,
    'create p95 < 600ms': (r) => r.timings.duration < 600,
  });

  const subscriptionId = JSON.parse(createRes.body)?.data?.id;

  sleep(0.5);

  if (subscriptionId) {
    // Get single
    const getRes = http.get(`${BASE_URL}/subscriptions/${subscriptionId}`, { headers });
    check(getRes, { 'get 200': (r) => r.status === 200 });

    sleep(0.3);

    // Add payment
    const paymentRes = http.post(
      `${BASE_URL}/subscriptions/${subscriptionId}/payments`,
      JSON.stringify({
        amount: 4999,
        is_manual: true,
        notes: 'k6 load test payment',
      }),
      { headers },
    );
    check(paymentRes, {
      'payment 201': (r) => r.status === 201,
      'payment p95 < 700ms': (r) => r.timings.duration < 700,
    });

    sleep(0.3);

    // List payments
    const paymentsRes = http.get(`${BASE_URL}/subscriptions/${subscriptionId}/payments`, { headers });
    check(paymentsRes, { 'payments list 200': (r) => r.status === 200 });
  }

  sleep(1);
}
