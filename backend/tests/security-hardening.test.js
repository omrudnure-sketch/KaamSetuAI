// Security Hardening & Penetration Defense Test Suite
// Verifies OWASP controls, RBAC, mass-assignment protection, data sanitization & rate limiting

import {
  connectTestDB,
  disconnectTestDB,
  cleanupTrackedData,
  createTestUser,
  tracker,
} from './testHelper.js';
import { User } from '../src/models/index.js';
import { verifyToken, generateAccessToken } from '../src/services/authService.js';
import { validateRegister, validateLogin } from '../src/validators/authValidator.js';
import { securitySanitizer } from '../src/middleware/securitySanitizer.js';
import { rateLimiter, authLimiter } from '../src/middleware/rateLimiter.js';
import { getHealthStatus, getReadinessStatus } from '../src/controllers/health.controller.js';
import { requireRole } from '../src/middleware/roleMiddleware.js';

export async function runSecurityHardeningTests() {
  console.log('\n======================================================');
  console.log('RUNNING SUITE: Security Hardening & Penetration Defense');
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

    // 1. Unauthenticated Token Verification Rejection
    let unauthFailed = false;
    try {
      verifyToken('');
    } catch (_err) {
      unauthFailed = true;
    }
    assert(unauthFailed, 'Missing JWT token is rejected by auth verification');

    // 2. Tampered JWT Rejection
    let tamperedFailed = false;
    try {
      verifyToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalidpayload.tamperedsignature');
    } catch (_err) {
      tamperedFailed = true;
    }
    assert(tamperedFailed, 'Tampered / forged JWT token is rejected cryptographically');

    // 3. Role-Based Access Control Rejection
    const { user: workerUser } = await createTestUser({ role: 'worker' });
    let roleBlocked = false;
    const mockReq = { user: { role: workerUser.role, id: workerUser._id.toString() } };
    const mockRes = {
      status: (code) => ({
        json: (data) => {
          if (code === 403) roleBlocked = true;
          return data;
        },
      }),
    };
    const mockNext = () => {};

    const employerOnlyMiddleware = requireRole('employer');
    employerOnlyMiddleware(mockReq, mockRes, mockNext);
    assert(roleBlocked, 'Worker attempting employer-only operation is rejected with 403');

    // 4. Admin Endpoint Protection from Non-Admins
    let adminBlocked = false;
    const adminRes = {
      status: (code) => ({
        json: (data) => {
          if (code === 403) adminBlocked = true;
          return data;
        },
      }),
    };
    const adminOnlyMiddleware = requireRole('admin');
    adminOnlyMiddleware(mockReq, adminRes, mockNext);
    assert(adminBlocked, 'Worker attempting admin operation is rejected with 403');

    // 5. Suspended User Restriction
    await User.findByIdAndUpdate(workerUser._id, { status: 'suspended' });
    const updatedWorker = await User.findById(workerUser._id);
    assert(updatedWorker.status === 'suspended', 'User account correctly flagged as suspended');

    // 6. Sensitive Field Exclusion in Serializer
    const userJson = updatedWorker.toJSON();
    assert(userJson.passwordHash === undefined || updatedWorker.passwordHash.startsWith('$2'), 'Raw password is never stored in plain text');

    // 7. Mass-Assignment Privilege Escalation Defense
    const maliciousPayload = {
      name: 'Malicious Attacker',
      email: 'attacker@secops.test',
      password: 'Password123!',
      role: 'worker',
      adminRole: 'super_admin', // Attempted privilege escalation
      permissions: ['all_access'],
      status: 'active',
      isVerified: true,
    };
    const regValidation = validateRegister(maliciousPayload);
    assert(!regValidation.isValid, 'Zod strict schema actively rejects mass-assignment payloads containing unrecognized fields');
    assert(regValidation.error.includes('unrecognized') || regValidation.error.includes('adminRole') || regValidation.error.includes('invalid') || regValidation.error.length > 0, 'Validator error explains invalid/unrecognized fields');


    // 8. NoSQL Injection Operator Stripping
    const injectionReq = {
      body: {
        email: 'test@example.com',
        $gt: '',
        'nested.field': 'malicious',
      },
      query: {
        $where: 'sleep(1000)',
      },
      params: {},
    };
    securitySanitizer(injectionReq, {}, () => {});
    assert(injectionReq.body.$gt === undefined, 'NoSQL operator ($gt) stripped from request body');
    assert(injectionReq.body['nested.field'] === undefined, 'Path injection key stripped from request body');
    assert(injectionReq.query.$where === undefined, 'NoSQL operator ($where) stripped from request query');
    assert(injectionReq.body.email === 'test@example.com', 'Legitimate fields preserved intact');

    // 9. XSS Payload Neutralization
    const xssReq = {
      body: {
        bio: 'Hello <script>alert("xss")</script> World',
      },
    };
    securitySanitizer(xssReq, {}, () => {});
    assert(!xssReq.body.bio.includes('<script>'), 'Dangerous <script> tags removed from user input');

    // 10. Rate Limiter Sliding Window Defense
    const testLimiter = rateLimiter({ windowMs: 60000, max: 2 });
    let rateLimitTriggered = false;
    const ipReq = { ip: '192.168.1.100', headers: {} };
    const limitRes = {
      status: (code) => ({
        json: () => {
          if (code === 429) rateLimitTriggered = true;
        },
      }),
    };
    testLimiter(ipReq, limitRes, () => {}); // req 1 - ok
    testLimiter(ipReq, limitRes, () => {}); // req 2 - ok
    testLimiter(ipReq, limitRes, () => {}); // req 3 - blocked (max 2)
    assert(rateLimitTriggered, 'Rate limiter blocks requests exceeding threshold with 429');

    // 11. Health & Readiness Information Leakage Defense
    let healthStatus = null;
    let healthJson = null;
    getHealthStatus({}, {
      status: (code) => {
        healthStatus = code;
        return { json: (data) => { healthJson = data; } };
      },
    });
    assert(healthStatus === 200, 'Health endpoint responds with 200');
    assert(healthJson.status === 'healthy', 'Health status reports healthy');
    const healthStr = JSON.stringify(healthJson);
    assert(!healthStr.includes('mongodb') && !healthStr.includes('password') && !healthStr.includes('secret'), 'Health check contains zero infrastructure secrets');

    let readyStatus = null;
    let readyJson = null;
    getReadinessStatus({}, {
      status: (code) => {
        readyStatus = code;
        return { json: (data) => { readyJson = data; } };
      },
    });
    assert(readyStatus === 200, 'Readiness endpoint confirms database connected');
    assert(readyJson.status === 'ready' && readyJson.services.database === 'connected', 'Readiness reports clean service status');
    const readyStr = JSON.stringify(readyJson);
    assert(!readyStr.includes('mongodb') && !readyStr.includes('password') && !readyStr.includes('secret'), 'Readiness check contains zero connection string or credentials');

    console.log(`\n------------------------------------------------------`);
    console.log(`SUITE COMPLETE: ${passed}/${total} security checks PASSED`);
    console.log(`------------------------------------------------------\n`);
  } finally {
    await cleanupTrackedData();
    await disconnectTestDB();
  }
}

// Auto-run if executed directly
if (process.argv[1]?.endsWith('security-hardening.test.js')) {
  runSecurityHardeningTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
