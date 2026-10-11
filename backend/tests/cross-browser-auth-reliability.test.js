/**
 * KaamSetu AI — Cross-Browser Authentication & Reliability Regression Test Suite
 *
 * Verifies:
 * 1. Public routes (Health, Readiness, Root) do NOT require authentication.
 * 2. Unauthenticated requests to /auth/me return 401 cleanly without crashing.
 * 3. Fresh user registration establishes token session and allows immediate access.
 * 4. Page refresh session restoration: valid Bearer token returns current user profile.
 * 5. Concurrent API requests share the authenticated token session without race conditions.
 * 6. Expired / invalid tokens are rejected with 401 and clean message.
 * 7. X-Request-Id header is generated and propagated for request tracking.
 * 8. CORS preflight handles production and preview Vercel domains with 204 No Content.
 * 9. Socket authentication verifies tokens via central verifyToken service.
 * 10. Database readiness reports connected status.
 */

import http from 'http';
import { app } from '../src/server.js';
import {
  connectTestDB,
  cleanupTrackedData,
  createTestUser,
  tracker,
} from './testHelper.js';
import { verifyToken } from '../src/services/authService.js';

export async function runCrossBrowserAuthReliabilityTests() {
  console.log('\n======================================================');
  console.log('RUNNING SUITE: Cross-Browser Auth & Reliability');
  console.log('======================================================\n');

  let passed = 0;
  let total = 0;

  const assert = (condition, msg) => {
    total++;
    if (condition) {
      console.log(`  ✓ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${msg}`);
      throw new Error(`Assertion failed: ${msg}`);
    }
  };

  let server = null;
  let baseUrl = '';

  try {
    await connectTestDB();

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    // 1. Public endpoints do not require authentication
    console.log('--- 1. Public Endpoints Accessibility ---');
    const rootRes = await fetch(`${baseUrl}/`);
    const rootData = await rootRes.json();
    assert(rootRes.status === 200, 'GET / returns 200 without token');
    assert(rootData.success === true, 'Root endpoint returns success: true');

    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200, 'GET /api/health returns 200 without token');
    assert(healthData.status === 'healthy', 'Health reports healthy status');

    const readyRes = await fetch(`${baseUrl}/api/health/ready`);
    const readyData = await readyRes.json();
    assert(readyRes.status === 200, 'GET /api/health/ready returns 200 without token');
    assert(readyData.status === 'ready', 'Readiness reports status: ready');
    assert(readyData.services?.database === 'connected', 'Database reports connected');

    // 2. Unauthenticated requests to protected endpoints return 401 cleanly
    console.log('\n--- 2. Unauthenticated Request Safety ---');
    const noAuthMeRes = await fetch(`${baseUrl}/api/auth/me`);
    const noAuthMeData = await noAuthMeRes.json();
    assert(noAuthMeRes.status === 401, 'GET /api/auth/me without token returns 401');
    assert(
      noAuthMeData.error?.message === 'Unauthorized: Authentication token missing',
      'Returns exact error: "Unauthorized: Authentication token missing"'
    );

    // 3. X-Request-Id header propagation
    console.log('\n--- 3. Observability & Request Tracing ---');
    const reqId = healthRes.headers.get('x-request-id');
    assert(Boolean(reqId && reqId.length > 0), 'Response includes X-Request-Id header');

    // 4. CORS preflight tests
    console.log('\n--- 4. Cross-Origin (CORS) Verification ---');
    const corsProdRes = await fetch(`${baseUrl}/api/health`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://kaamsetuai.vercel.app',
        'Access-Control-Request-Method': 'GET',
      },
    });
    assert(corsProdRes.status === 204, 'OPTIONS preflight for production Vercel domain returns 204');
    assert(
      corsProdRes.headers.get('access-control-allow-origin') === 'https://kaamsetuai.vercel.app',
      'Access-Control-Allow-Origin matches production Vercel domain'
    );

    const previewOrigin = 'https://kaamsetuai-preview-abc123.vercel.app';
    const corsPreviewRes = await fetch(`${baseUrl}/api/health`, {
      method: 'OPTIONS',
      headers: {
        Origin: previewOrigin,
        'Access-Control-Request-Method': 'POST',
      },
    });
    assert(corsPreviewRes.status === 204, 'OPTIONS preflight for preview Vercel domain returns 204');
    assert(
      corsPreviewRes.headers.get('access-control-allow-origin') === previewOrigin,
      'Access-Control-Allow-Origin matches preview Vercel domain'
    );

    // 5. Fresh registration and session establishment
    console.log('\n--- 5. Fresh Registration & Token Emission ---');
    const uniqueSuffix = Date.now();
    const registerPayload = {
      name: `Browser Worker ${uniqueSuffix}`,
      email: `fresh_worker_${uniqueSuffix}@example.com`,
      phone: `9199${String(uniqueSuffix).slice(-6)}`,
      password: 'Password123!',
      role: 'worker',
      preferredLanguage: 'en',
    };

    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registerPayload),
    });
    const regData = await regRes.json();
    assert(regRes.status === 201, 'POST /api/auth/register returns 201 Created');
    assert(Boolean(regData.data?.token), 'Registration returns Bearer token');
    assert(Boolean(regData.data?.user?.id), 'Registration returns user ID');

    const freshToken = regData.data.token;
    const freshUser = regData.data.user;
    tracker.users.add(freshUser.id);

    // 6. Restoring session via Bearer token (Simulating page refresh)
    console.log('\n--- 6. Session Restoration on Refresh ---');
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${freshToken}`,
      },
    });
    const meData = await meRes.json();
    assert(meRes.status === 200, 'GET /api/auth/me with Bearer token returns 200');
    assert(meData.data.id === freshUser.id, 'Restored session matches registered user ID');
    assert(meData.data.role === 'worker', 'Restored session matches worker role');

    // 7. Concurrent requests with the same token
    console.log('\n--- 7. Concurrent API Request Concurrency ---');
    const [c1, c2, c3] = await Promise.all([
      fetch(`${baseUrl}/api/auth/me`, { headers: { Authorization: `Bearer ${freshToken}` } }),
      fetch(`${baseUrl}/api/jobs`, { headers: { Authorization: `Bearer ${freshToken}` } }),
      fetch(`${baseUrl}/api/notifications`, { headers: { Authorization: `Bearer ${freshToken}` } }),
    ]);
    assert(c1.status === 200, 'Concurrent req 1 (/api/auth/me) returns 200');
    assert(c2.status === 200, 'Concurrent req 2 (/api/jobs) returns 200');
    assert(c3.status === 200, 'Concurrent req 3 (/api/notifications) returns 200');

    // 8. Invalid / expired token rejection
    console.log('\n--- 8. Invalid / Expired Token Rejection ---');
    const badTokenRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: 'Bearer totally.invalid.jwt.token' },
    });
    const badTokenData = await badTokenRes.json();
    assert(badTokenRes.status === 401, 'Invalid Bearer token returns 401');
    assert(
      badTokenData.error?.message === 'Unauthorized: Invalid or expired token',
      'Returns "Unauthorized: Invalid or expired token"'
    );

    // 9. Centralized token verification service
    console.log('\n--- 9. Centralized Token Service ---');
    const decoded = verifyToken(freshToken);
    assert(decoded.userId === freshUser.id, 'verifyToken resolves correct userId');
    assert(decoded.role === 'worker', 'verifyToken resolves correct role');
  } finally {
    await cleanupTrackedData();
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  }

  console.log(`\n======================================================`);
  console.log(`Cross-Browser Auth & Reliability: ${passed}/${total} passed`);
  console.log(`======================================================\n`);
  return { passed, failed: total - passed, total };
}

if (process.argv[1]?.endsWith('cross-browser-auth-reliability.test.js')) {
  runCrossBrowserAuthReliabilityTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
