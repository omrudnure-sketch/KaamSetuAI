import {
  connectTestDB,
  disconnectTestDB,
  cleanupTrackedData,
  createTestUser,
  tracker,
} from './testHelper.js';
import { User, Job, Project, HiringAgreement } from '../src/models/index.js';
import { validateRegister } from '../src/validators/authValidator.js';
import { comparePassword, verifyToken } from '../src/services/authService.js';
import { ADMIN_ROLE_PERMISSIONS } from '../src/middleware/adminMiddleware.js';
import { getProject } from '../src/services/projectService.js';
import mongoose from 'mongoose';

export async function runAuthAuthzTests() {
  console.log('\n========================================');
  console.log('RUNNING SUITE: Authentication & Authorization');
  console.log('========================================');

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

    // 1. Worker Registration validation
    const workerReg = validateRegister({
      name: 'Test Worker',
      phone: '9876543210',
      password: 'Password123!',
      role: 'worker',
      preferredLanguage: 'mr',
    });
    assert(workerReg.isValid === true, 'Worker registration passes validation with Marathi language');

    // 2. Employer Registration validation
    const empReg = validateRegister({
      name: 'Test Employer',
      email: 'employer@example.com',
      password: 'Password123!',
      role: 'employer',
      preferredLanguage: 'en',
    });
    assert(empReg.isValid === true, 'Employer registration passes validation');

    // 3. Employer Marathi restriction
    const empInvalidLang = validateRegister({
      name: 'Test Employer',
      email: 'employer_mr@example.com',
      password: 'Password123!',
      role: 'employer',
      preferredLanguage: 'mr',
    });
    assert(empInvalidLang.isValid === false, 'Employer registration rejects non-English languages');

    // 4. Public Admin registration is rejected
    const adminReg = validateRegister({
      name: 'Hacker Admin',
      email: 'hacker@example.com',
      password: 'Password123!',
      role: 'admin',
    });
    assert(adminReg.isValid === false, 'Public admin registration is strictly forbidden');

    // 5. Password hashing and verification
    const { user: testWorker, token: workerToken } = await createTestUser({
      name: 'Auth Worker',
      role: 'worker',
    });
    const pwdMatches = await comparePassword('Password123!', testWorker.passwordHash);
    const pwdWrong = await comparePassword('WrongPassword!', testWorker.passwordHash);
    assert(pwdMatches === true && pwdWrong === false, 'Password hashing and comparison are secure');

    // 6. JWT token verification and payload integrity
    const decoded = verifyToken(workerToken);
    assert(
      decoded.userId === testWorker._id.toString() && decoded.role === 'worker',
      'JWT contains valid userId and role in payload'
    );

    // 7. Invalid/Tampered JWT is rejected
    let tamperedRejected = false;
    try {
      verifyToken(workerToken + 'tampered');
    } catch (_e) {
      tamperedRejected = true;
    }
    assert(tamperedRejected === true, 'Tampered JWT token throws validation error');

    // 8. Suspended Account Restrictions
    const { user: suspendedWorker } = await createTestUser({
      name: 'Suspended Worker',
      role: 'worker',
      status: 'suspended',
    });
    assert(suspendedWorker.status === 'suspended', 'Suspended account status is accurately recorded');

    // 9. Role Permissions Matrix enforcement
    assert(
      ADMIN_ROLE_PERMISSIONS.super_admin.includes('*'),
      'Super admin role has wildcard root permissions'
    );
    assert(
      ADMIN_ROLE_PERMISSIONS.operations_admin.includes('risk.manage') &&
        !ADMIN_ROLE_PERMISSIONS.analytics_admin.includes('risk.manage'),
      'Operations admin has risk.manage permission while analytics_admin does not'
    );
    assert(
      ADMIN_ROLE_PERMISSIONS.support_admin.includes('complaints.manage') &&
        !ADMIN_ROLE_PERMISSIONS.verification_admin.includes('complaints.manage'),
      'Support admin has complaints.manage permission while verification_admin does not'
    );

    // 10. Object-Level Authorization: User cannot view another employer\'s private project
    const { user: empA } = await createTestUser({ name: 'Employer A', role: 'employer' });
    const { user: empB } = await createTestUser({ name: 'Employer B', role: 'employer' });

    const dummyJob = await Job.create({
      employerId: empA._id,
      title: 'Private Job',
      description: 'Private job description',
      skillRequired: 'carpenter',
      wageAmount: 800,
      startDate: new Date(),
      location: { city: 'Mumbai' },
    });
    tracker.jobs.add(dummyJob._id);

    const dummyProject = await Project.create({
      jobId: dummyJob._id,
      employerId: empA._id,
      createdFromHiringAgreement: new mongoose.Types.ObjectId(),
      name: 'Employer A Private Project',
      durationType: 'single_day',
      paymentType: 'daily',
      paymentAmount: 800,
      startDate: new Date(),
      status: 'confirmed',
    });
    tracker.projects.add(dummyProject._id);

    // Employer A can access their own project
    const empAAccess = await getProject(empA._id.toString(), 'employer', dummyProject._id);
    assert(Boolean(empAAccess.project), 'Employer A can access their own project');

    // Employer B attempting access must be rejected with 403
    let empBRejected = false;
    try {
      await getProject(empB._id.toString(), 'employer', dummyProject._id);
    } catch (err) {
      if (err.statusCode === 403) empBRejected = true;
    }
    assert(empBRejected === true, 'Employer B is rejected with 403 when trying to access Employer A project');

    // Worker who is not on the project must be rejected with 403
    let workerRejected = false;
    try {
      await getProject(testWorker._id.toString(), 'worker', dummyProject._id);
    } catch (err) {
      if (err.statusCode === 403) workerRejected = true;
    }
    assert(workerRejected === true, 'Worker not assigned to project is rejected with 403');

    console.log(`\nSUITE PASSED: ${passed}/${total} assertions succeeded.\n`);
    return { passed, total };
  } finally {
    await cleanupTrackedData();
  }
}

if (process.argv[1]?.endsWith('auth-authz.test.js')) {
  runAuthAuthzTests()
    .then(() => disconnectTestDB())
    .catch((err) => {
      console.error(err);
      disconnectTestDB().then(() => process.exit(1));
    });
}
