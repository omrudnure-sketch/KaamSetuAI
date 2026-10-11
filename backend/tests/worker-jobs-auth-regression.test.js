import http from 'http';
import jwt from 'jsonwebtoken';
import {
  connectTestDB,
  cleanupTrackedData,
  createTestUser,
  tracker,
} from './testHelper.js';
import { app } from '../src/server.js';
import { Job, WorkerProfile } from '../src/models/index.js';
import { getCookieOptions } from '../src/controllers/authController.js';

export async function runWorkerJobsAuthRegressionTests() {
  console.log('\n======================================================');
  console.log('RUNNING SUITE: Worker Jobs Authentication Regression');
  console.log('======================================================');

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

    // Start ephemeral test server on port 0
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}/api`;

    // Setup: Create test worker user and employer user
    const password = 'Password123!';
    const { user: workerUser } = await createTestUser({
      name: 'Ramesh Pawar',
      role: 'worker',
      password,
    });
    const workerProfile = await WorkerProfile.create({
      userId: workerUser._id,
      skills: ['electrician'],
      experienceYears: 4,
      dailyRate: 800,
      isAvailable: true,
      serviceAreas: ['Pune'],
    });
    tracker.workerProfiles.add(workerProfile._id);

    const { user: employerUser, token: employerToken } = await createTestUser({
      name: 'Pooja Enterprises',
      role: 'employer',
      password,
    });

    // Create an open job to browse
    const testJob = await Job.create({
      employerId: employerUser._id,
      title: 'Urgent Electrician for House Wiring',
      description: 'Need certified electrician for complete rewiring',
      skillRequired: 'electrician',
      workersRequired: 1,
      wageType: 'daily',
      wageAmount: 900,
      durationType: 'single_day',
      status: 'open',
      location: { city: 'Pune', area: 'Kothrud' },
    });
    tracker.jobs.add(testJob._id);

    // ========================================================
    // 1. REGRESSION TEST: Login and Token Emission
    // ========================================================
    console.log('\n--- 1. Login Authentication & Token Emission ---');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: workerUser.email,
        password,
      }),
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200, 'POST /api/auth/login returns 200 OK');
    assert(loginData.success === true, 'Login response success is true');
    assert(Boolean(loginData.data?.token), 'Login response contains JWT token in data.token');
    assert(loginData.data?.user?.id === workerUser._id.toString(), 'Login response contains matching user object');
    assert(loginData.data?.user?.role === 'worker', 'User role is correctly identified as worker');

    // Extract Bearer token from login response
    const workerBearerToken = loginData.data.token;

    // Check Set-Cookie header exists on login response
    const setCookieHeader = loginRes.headers.get('set-cookie');
    assert(Boolean(setCookieHeader && setCookieHeader.includes('token=')), 'Set-Cookie header sets auth cookie');

    // ========================================================
    // 2. REGRESSION TEST: Protected Jobs Request with Bearer Token
    // ========================================================
    console.log('\n--- 2. Protected Jobs Request via Bearer Token ---');
    const jobsRes = await fetch(`${baseUrl}/jobs`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${workerBearerToken}`,
      },
    });
    const jobsData = await jobsRes.json();
    assert(jobsRes.status === 200, 'GET /api/jobs with Authorization Bearer header returns 200 OK');
    assert(jobsData.success === true, 'Jobs response indicates success: true');
    assert(Array.isArray(jobsData.data?.jobs), 'Jobs payload contains array of jobs');
    assert(jobsData.data.jobs.length >= 1, 'Worker can retrieve available open jobs successfully');

    // ========================================================
    // 3. REGRESSION TEST: Page Refresh (Session Restoration /auth/me)
    // ========================================================
    console.log('\n--- 3. Page Refresh Session Restoration (/api/auth/me) ---');
    const meRes = await fetch(`${baseUrl}/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${workerBearerToken}`,
      },
    });
    const meData = await meRes.json();
    assert(meRes.status === 200, 'GET /api/auth/me on page refresh returns 200 OK');
    assert(meData.success === true, 'Session restore response indicates success: true');
    assert(meData.data?.id === workerUser._id.toString(), 'Session restore retrieves correct worker user');
    assert(meData.data?.role === 'worker', 'Session restore preserves worker role');

    // ========================================================
    // 4. REGRESSION TEST: Missing Credentials (Unauthenticated 401)
    // ========================================================
    console.log('\n--- 4. Missing Credentials Rejection (401) ---');
    const noAuthJobsRes = await fetch(`${baseUrl}/jobs`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const noAuthJobsData = await noAuthJobsRes.json();
    assert(noAuthJobsRes.status === 401, 'GET /api/jobs without credentials returns 401 Unauthorized');
    assert(
      noAuthJobsData.error?.message === 'Unauthorized: Authentication token missing',
      'Returns exact error: "Unauthorized: Authentication token missing"'
    );

    const noAuthMeRes = await fetch(`${baseUrl}/auth/me`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const noAuthMeData = await noAuthMeRes.json();
    assert(noAuthMeRes.status === 401, 'GET /api/auth/me without credentials returns 401 Unauthorized');
    assert(
      noAuthMeData.error?.message === 'Unauthorized: Authentication token missing',
      '/auth/me returns exact error: "Unauthorized: Authentication token missing"'
    );

    // ========================================================
    // 5. REGRESSION TEST: Expired Token Rejection (401)
    // ========================================================
    console.log('\n--- 5. Expired Token Rejection (401) ---');
    const secret = process.env.JWT_SECRET || 'test_jwt_secret_for_automated_test_suites_32chars_long';
    // Create an already-expired token (signed with 0s / negative lifetime)
    const expiredToken = jwt.sign(
      { userId: workerUser._id.toString(), role: 'worker' },
      secret,
      { expiresIn: '0s' }
    );

    // Small delay to ensure expiration timestamp is in the past
    await new Promise((r) => setTimeout(r, 100));

    const expiredJobsRes = await fetch(`${baseUrl}/jobs`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${expiredToken}`,
      },
    });
    const expiredJobsData = await expiredJobsRes.json();
    assert(expiredJobsRes.status === 401, 'GET /api/jobs with expired token returns 401 Unauthorized');
    assert(
      expiredJobsData.error?.message === 'Unauthorized: Invalid or expired token',
      'Returns exact error: "Unauthorized: Invalid or expired token"'
    );

    const expiredMeRes = await fetch(`${baseUrl}/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${expiredToken}`,
      },
    });
    const expiredMeData = await expiredMeRes.json();
    assert(expiredMeRes.status === 401, 'GET /api/auth/me with expired token returns 401 Unauthorized');
    assert(
      expiredMeData.error?.message === 'Unauthorized: Invalid or expired token',
      '/auth/me returns exact error: "Unauthorized: Invalid or expired token"'
    );

    // ========================================================
    // 6. REGRESSION TEST: Cookie Authentication Fallback
    // ========================================================
    console.log('\n--- 6. Cookie Authentication Support ---');
    const cookieJobsRes = await fetch(`${baseUrl}/jobs`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${workerBearerToken}`,
      },
    });
    assert(cookieJobsRes.status === 200, 'GET /api/jobs with Cookie header fallback returns 200 OK');

    // ========================================================
    // 7. REGRESSION TEST: Production Cookie Options Verification
    // ========================================================
    console.log('\n--- 7. Production Cookie Configuration ---');
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const prodCookieOpts = getCookieOptions();
    assert(prodCookieOpts.sameSite === 'none', 'Production cookie uses sameSite: "none" for cross-site SPA support');
    assert(prodCookieOpts.secure === true, 'Production cookie uses secure: true');
    assert(prodCookieOpts.httpOnly === true, 'Production cookie is httpOnly: true');
    assert(prodCookieOpts.maxAge > 0, 'Production cookie defines positive maxAge');
    process.env.NODE_ENV = prevEnv;

    // ========================================================
    // 8. REGRESSION TEST: Role Access Guard
    // ========================================================
    console.log('\n--- 8. Role-Based Access Guard ---');
    const employerJobsRes = await fetch(`${baseUrl}/jobs`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employerToken}`,
      },
    });
    assert(employerJobsRes.status === 403, 'GET /api/jobs with employer token returns 403 Forbidden');

    console.log(`\nAll ${passed}/${total} regression assertions passed successfully!`);
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await cleanupTrackedData();
  }
}

// Execute directly if run as main file
if (process.argv[1]?.includes('worker-jobs-auth-regression.test.js')) {
  runWorkerJobsAuthRegressionTests()
    .then(() => {
      console.log('✓ Regression suite completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('✗ Regression suite failed:', err);
      process.exit(1);
    });
}
