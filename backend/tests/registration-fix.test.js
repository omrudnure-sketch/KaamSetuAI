import { connectTestDB, disconnectTestDB, cleanupTrackedData, tracker } from './testHelper.js';
import { User, WorkerProfile, EmployerProfile } from '../src/models/index.js';
import { register } from '../src/controllers/authController.js';
import { corsOptions } from '../src/server.js';
import { comparePassword, verifyToken } from '../src/services/authService.js';

export async function runRegistrationFixTests() {
  console.log('\n======================================================');
  console.log('RUNNING SUITE: Registration & CORS Verification');
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

  try {
    await connectTestDB();

    // 1. Test CORS Origin Allowlist in production mode
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const testOrigins = [
      { origin: 'https://kaamsetuai.vercel.app', shouldAllow: true, desc: 'Production Vercel domain' },
      { origin: 'https://kaamsetu-ai.vercel.app', shouldAllow: true, desc: 'Hyphenated Vercel domain' },
      { origin: 'https://kaamsetuai-preview-abc.vercel.app', shouldAllow: true, desc: 'Vercel preview branch domain' },
      { origin: 'http://localhost:5173', shouldAllow: true, desc: 'Vite localhost' },
      { origin: 'http://localhost:3000', shouldAllow: true, desc: 'Local dev 3000' },
      { origin: 'https://malicious-attacker-site.com', shouldAllow: false, desc: 'Untrusted origin blocked' },
    ];

    for (const { origin, shouldAllow, desc } of testOrigins) {
      let allowed = false;
      await new Promise((resolve) => {
        corsOptions.origin(origin, (err, allow) => {
          allowed = Boolean(allow && !err);
          resolve();
        });
      });
      assert(allowed === shouldAllow, `CORS check: ${desc} (allowed=${allowed})`);
    }

    process.env.NODE_ENV = origEnv;

    // 2. Test Worker Registration Flow & Profile Auto-Creation
    const workerReq = {
      body: {
        name: 'Karan Jadhav',
        email: `karan_${Date.now()}@gmail.com`,
        phone: `92091${String(Date.now()).slice(-5)}`,
        password: 'Password123!',
        role: 'worker',
        preferredLanguage: 'mr',
      },
    };

    let workerResStatus = null;
    let workerResBody = null;
    let workerCookies = {};

    const mockRes = {
      status(code) {
        workerResStatus = code;
        return this;
      },
      json(body) {
        workerResBody = body;
        return this;
      },
      cookie(name, val, options) {
        workerCookies[name] = { val, options };
        return this;
      },
    };

    await register(workerReq, mockRes, (err) => {
      if (err) throw err;
    });

    assert(workerResStatus === 201, 'Worker registration returns HTTP 201 Created');
    assert(Boolean(workerResBody?.success), 'Response has success: true');
    assert(Boolean(workerResBody?.data?.user?.id), 'Response contains created user object with ID');
    assert(workerResBody?.data?.user?.role === 'worker', 'User role is correctly set to worker');
    assert(workerResBody?.data?.user?.preferredLanguage === 'mr', 'Preferred language is preserved');
    assert(Boolean(workerResBody?.data?.token), 'Response includes JWT access token');
    assert(Boolean(workerCookies.token), 'Auth cookie is set with HTTP-only token');

    // Track for cleanup
    tracker.users.add(workerResBody.data.user.id);

    // Verify Password Hash
    const savedUserInDb = await User.findById(workerResBody.data.user.id);
    const pwdValid = await comparePassword('Password123!', savedUserInDb.passwordHash);
    assert(pwdValid === true, 'Stored password is securely hashed with bcrypt');
    assert(savedUserInDb.passwordHash !== 'Password123!', 'Plain-text password is never persisted');

    // Verify Worker Profile auto-creation
    const profileInDb = await WorkerProfile.findOne({ userId: workerResBody.data.user.id });
    assert(Boolean(profileInDb), 'Worker profile was auto-initialized linked to userId');
    assert(profileInDb?.fullName === 'Karan Jadhav', 'Worker profile initialized with registration name');
    if (profileInDb) tracker.workerProfiles.add(profileInDb._id);

    // Verify Token validity
    const decoded = verifyToken(workerResBody.data.token);
    assert(decoded.userId === workerResBody.data.user.id, 'JWT token contains valid userId');
    assert(decoded.role === 'worker', 'JWT token contains valid role');

    // 3. Test Employer Registration Flow & Profile Auto-Creation
    const empReq = {
      body: {
        name: 'Meera Patil',
        email: `meera_${Date.now()}@gmail.com`,
        phone: `91091${String(Date.now()).slice(-5)}`,
        password: 'Password123!',
        role: 'employer',
        preferredLanguage: 'en',
      },
    };

    let empResStatus = null;
    let empResBody = null;
    const mockEmpRes = {
      status(code) {
        empResStatus = code;
        return this;
      },
      json(body) {
        empResBody = body;
        return this;
      },
      cookie() {
        return this;
      },
    };

    await register(empReq, mockEmpRes, (err) => {
      if (err) throw err;
    });

    assert(empResStatus === 201, 'Employer registration returns HTTP 201 Created');
    tracker.users.add(empResBody.data.user.id);

    const empProfile = await EmployerProfile.findOne({ userId: empResBody.data.user.id });
    assert(Boolean(empProfile), 'Employer profile was auto-initialized linked to userId');
    assert(empProfile?.name === 'Meera Patil', 'Employer profile initialized with registration name');
    if (empProfile) tracker.employerProfiles.add(empProfile._id);

    // 4. Test Duplicate Email/Phone Rejection (HTTP 409 Conflict)
    let dupStatus = null;
    let dupBody = null;
    const dupRes = {
      status(code) {
        dupStatus = code;
        return this;
      },
      json(body) {
        dupBody = body;
        return this;
      },
      cookie() {
        return this;
      },
    };

    await register(workerReq, dupRes, (err) => {
      if (err) throw err;
    });

    assert(dupStatus === 409, 'Duplicate account registration is rejected with HTTP 409 Conflict');
    assert(dupBody?.success === false, 'Duplicate response has success: false');

    console.log(`\nSUITE PASSED: ${passed}/${total} assertions succeeded.\n`);
    return { passed, total };
  } finally {
    await cleanupTrackedData();
  }
}

if (process.argv[1]?.endsWith('registration-fix.test.js')) {
  runRegistrationFixTests()
    .then(() => disconnectTestDB())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      disconnectTestDB().then(() => process.exit(1));
    });
}
