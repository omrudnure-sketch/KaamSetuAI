import { connectTestDB, disconnectTestDB, cleanupTrackedData, tracker } from './testHelper.js';
import { User, WorkerProfile, EmployerProfile } from '../src/models/index.js';
import { register, login } from '../src/controllers/authController.js';

export async function runRoleBasedEmailTests() {
  console.log('\n======================================================');
  console.log('RUNNING SUITE: Role-Based Email Requirements & Tests');
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

  const createMockRes = () => {
    const res = {
      statusCode: null,
      body: null,
      cookies: {},
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
      cookie(name, val, opts) {
        this.cookies[name] = { val, opts };
        return this;
      },
    };
    return res;
  };

  try {
    await connectTestDB();

    const timestamp = Date.now();
    const workerPhone1 = `98${String(timestamp).slice(-8)}`;
    const workerPhone2 = `97${String(timestamp + 1).slice(-8)}`;
    const workerPhone3 = `96${String(timestamp + 2).slice(-8)}`;
    const employerPhone1 = `95${String(timestamp + 3).slice(-8)}`;
    const employerPhone2 = `94${String(timestamp + 4).slice(-8)}`;
    const sharedEmail = `shared_emp_${timestamp}@example.com`;

    // --------------------------------------------------------------------------
    // WORKER TEST CASES
    // --------------------------------------------------------------------------
    console.log('--- Worker Email Requirement Tests ---');

    // Case W1: Register with mobile number and password only (No Email) — MUST SUCCEED
    const resW1 = createMockRes();
    await register(
      {
        body: {
          name: 'Sunil Pawar',
          phone: workerPhone1,
          password: 'Password123!',
          role: 'worker',
          preferredLanguage: 'mr',
        },
      },
      resW1,
      (err) => { if (err) throw err; }
    );

    assert(resW1.statusCode === 201, 'W1: Worker registers with mobile and password only (HTTP 201)');
    assert(Boolean(resW1.body?.data?.user?.id), 'W1: Response returns created worker with ID');
    assert(resW1.body?.data?.user?.email === null, 'W1: Worker email is stored as strictly NULL, not fake email');
    tracker.users.add(resW1.body.data.user.id);

    // Case W2: Register with mobile number, valid email and password — MUST SUCCEED
    const workerEmail2 = `sunil_with_email_${timestamp}@example.com`;
    const resW2 = createMockRes();
    await register(
      {
        body: {
          name: 'Anil Shinde',
          phone: workerPhone2,
          email: workerEmail2,
          password: 'Password123!',
          role: 'worker',
          preferredLanguage: 'hi',
        },
      },
      resW2,
      (err) => { if (err) throw err; }
    );

    assert(resW2.statusCode === 201, 'W2: Worker registers with mobile, valid email, and password (HTTP 201)');
    assert(resW2.body?.data?.user?.email === workerEmail2.toLowerCase(), 'W2: Worker email is preserved in lowercase');
    tracker.users.add(resW2.body.data.user.id);

    // Case W3: Register with invalid email — MUST FAIL with clear message
    const resW3 = createMockRes();
    await register(
      {
        body: {
          name: 'Prakash Kale',
          phone: workerPhone3,
          email: 'not-a-valid-email-string',
          password: 'Password123!',
          role: 'worker',
        },
      },
      resW3,
      (err) => { if (err) throw err; }
    );

    assert(resW3.statusCode === 400, 'W3: Worker registration with invalid email is rejected (HTTP 400)');
    assert(
      resW3.body?.error?.message?.includes('Invalid email address format'),
      'W3: Clear validation message returned for invalid worker email'
    );

    // Case W4: Register with duplicate email — MUST FAIL (HTTP 409 Conflict)
    const resW4 = createMockRes();
    await register(
      {
        body: {
          name: 'Duplicate Worker Email',
          phone: `93${String(timestamp + 5).slice(-8)}`,
          email: workerEmail2, // Already registered in W2
          password: 'Password123!',
          role: 'worker',
        },
      },
      resW4,
      (err) => { if (err) throw err; }
    );

    assert(resW4.statusCode === 409, 'W4: Worker registration with duplicate email rejected with HTTP 409 Conflict');
    assert(
      resW4.body?.error?.message?.includes('already exists'),
      'W4: Duplicate email returns clear conflict message'
    );

    // Case W5: Worker logs in using mobile number and password — MUST SUCCEED
    const resW5 = createMockRes();
    await login(
      {
        body: {
          email: workerPhone1, // logging in with mobile number
          password: 'Password123!',
        },
      },
      resW5,
      (err) => { if (err) throw err; }
    );

    assert(resW5.statusCode === 200, 'W5: Worker successfully logs in using mobile number and password');
    assert(resW5.body?.data?.user?.phone === workerPhone1, 'W5: Authenticated user matches registered phone');

    // Case W6: Worker logs in using registered email and password — MUST SUCCEED
    const resW6 = createMockRes();
    await login(
      {
        body: {
          email: workerEmail2, // logging in with email
          password: 'Password123!',
        },
      },
      resW6,
      (err) => { if (err) throw err; }
    );

    assert(resW6.statusCode === 200, 'W6: Worker successfully logs in using registered email and password');
    assert(resW6.body?.data?.user?.email === workerEmail2.toLowerCase(), 'W6: Authenticated user matches registered email');

    // Case W7: Worker without email is NOT blocked by email verification
    const savedWorkerNoEmail = await User.findById(resW1.body.data.user.id);
    assert(savedWorkerNoEmail.email === null, 'W7: Database confirms email is strictly NULL in storage');
    assert(savedWorkerNoEmail.status === 'active', 'W7: Worker without email is in active status');
    assert(Boolean(resW5.body?.data?.token), 'W7: Worker without email received full JWT token and active session');

    // Case W8: Full name exceeding 50 characters is rejected
    const resW8 = createMockRes();
    await register(
      {
        body: {
          name: 'This Name Is Extremely Long And Exceeds The Maximum Limit Of Fifty Characters Allowed For Registration',
          phone: `92${String(timestamp + 6).slice(-8)}`,
          password: 'Password123!',
          role: 'worker',
        },
      },
      resW8,
      (err) => { if (err) throw err; }
    );
    assert(resW8.statusCode === 400, 'W8: Full name exceeding 50 characters is rejected with HTTP 400');
    assert(resW8.body?.error?.message?.includes('50 characters'), 'W8: Clear 50-character limit validation message returned');

    // Case W9: Indian mobile number with +91 prefix is normalized to 10 digits
    const pure10Digits = `91${String(timestamp + 7).slice(-8)}`;
    const resW9 = createMockRes();
    await register(
      {
        body: {
          name: 'Suresh Patil',
          phone: `+91${pure10Digits}`,
          password: 'Password123!',
          role: 'worker',
        },
      },
      resW9,
      (err) => { if (err) throw err; }
    );
    assert(resW9.statusCode === 201, 'W9: Registration with +91 phone succeeds (HTTP 201)');
    assert(resW9.body?.data?.user?.phone === pure10Digits, 'W9: +91 is stripped and phone is saved cleanly as 10 digits');
    tracker.users.add(resW9.body.data.user.id);

    // --------------------------------------------------------------------------
    // EMPLOYER TEST CASES
    // --------------------------------------------------------------------------
    console.log('\n--- Employer Email Requirement Tests ---');

    // Case E1: Register without email — MUST FAIL
    const resE1 = createMockRes();
    await register(
      {
        body: {
          name: 'Metro Infrastructure Ltd',
          phone: employerPhone1,
          email: '', // Empty email
          password: 'Password123!',
          role: 'employer',
          preferredLanguage: 'en',
        },
      },
      resE1,
      (err) => { if (err) throw err; }
    );

    assert(resE1.statusCode === 400, 'E1: Employer registration without email is rejected (HTTP 400)');
    assert(
      resE1.body?.error?.message?.includes('Email address is required for employer registration'),
      'E1: Clear error message indicates email is mandatory for employers'
    );

    // Case E2: Register with invalid email — MUST FAIL
    const resE2 = createMockRes();
    await register(
      {
        body: {
          name: 'Metro Infrastructure Ltd',
          phone: employerPhone1,
          email: 'invalid-employer-email-without-domain',
          password: 'Password123!',
          role: 'employer',
          preferredLanguage: 'en',
        },
      },
      resE2,
      (err) => { if (err) throw err; }
    );

    assert(resE2.statusCode === 400, 'E2: Employer registration with invalid email format is rejected (HTTP 400)');
    assert(
      resE2.body?.error?.message?.includes('Invalid email address format'),
      'E2: Clear format validation message returned'
    );

    // Case E3: Register with valid email and mobile number — MUST PASS
    const resE3 = createMockRes();
    await register(
      {
        body: {
          name: 'Metro Infrastructure Ltd',
          phone: employerPhone1,
          email: sharedEmail,
          password: 'Password123!',
          role: 'employer',
          preferredLanguage: 'en',
        },
      },
      resE3,
      (err) => { if (err) throw err; }
    );

    assert(resE3.statusCode === 201, 'E3: Employer registration with valid email and mobile passes (HTTP 201)');
    assert(Boolean(resE3.body?.data?.user?.id), 'E3: Response contains created employer object');
    assert(resE3.body?.data?.user?.email === sharedEmail.toLowerCase(), 'E3: Employer email properly stored');
    tracker.users.add(resE3.body.data.user.id);

    // Case E4: Register with duplicate email — MUST FAIL
    const resE4 = createMockRes();
    await register(
      {
        body: {
          name: 'Duplicate Employer Ltd',
          phone: employerPhone2,
          email: sharedEmail, // Duplicate of E3
          password: 'Password123!',
          role: 'employer',
          preferredLanguage: 'en',
        },
      },
      resE4,
      (err) => { if (err) throw err; }
    );

    assert(resE4.statusCode === 409, 'E4: Employer registration with duplicate email rejected with HTTP 409 Conflict');
    assert(
      resE4.body?.error?.message?.includes('already exists'),
      'E4: Conflict response returned'
    );

    // Case E5: Employer logs in using registered email and password — MUST WORK
    const resE5 = createMockRes();
    await login(
      {
        body: {
          email: sharedEmail,
          password: 'Password123!',
        },
      },
      resE5,
      (err) => { if (err) throw err; }
    );

    assert(resE5.statusCode === 200, 'E5: Employer logs in using registered email and password');
    assert(resE5.body?.data?.user?.role === 'employer', 'E5: Authenticated session confirmed as employer role');

    console.log(`\n======================================================`);
    console.log(`ROLE-BASED EMAIL SUITE PASSED: ${passed}/${total} assertions succeeded.`);
    console.log(`======================================================\n`);

    return { passed, total };
  } finally {
    await cleanupTrackedData();
  }
}

if (process.argv[1]?.endsWith('role-based-email-requirements.test.js')) {
  runRoleBasedEmailTests()
    .then(() => disconnectTestDB())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      disconnectTestDB().then(() => process.exit(1));
    });
}

