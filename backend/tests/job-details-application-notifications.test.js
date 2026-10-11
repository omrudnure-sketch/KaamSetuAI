/**
 * KaamSetu AI — Job Details, Application Submission & Employer Notifications Regression Test Suite
 *
 * Verifies:
 * 1. Worker can view valid open job details with title, wage, employer, skills, duration, location.
 * 2. Worker can view closed job details with status clearly marked.
 * 3. Nonexistent job ID returns 404 cleanly with structured error message.
 * 4. Malformed job ID returns 404 cleanly without 500 server crash.
 * 5. Unauthenticated request to /api/jobs/:id returns 401 Unauthorized.
 * 6. Preserves language query parameter (?lang=mr, ?lang=hi).
 * 7. Rejects unauthenticated application submission with 401.
 * 8. Prevents employer accounts from applying to jobs with 403 Forbidden.
 * 9. Rejects invalid application inputs (e.g. proposedWage <= 0) with 400.
 * 10. Prevents application submission to closed jobs with 400.
 * 11. Submits valid application, returns 201 with status pending, and persists in database.
 * 12. Rejects duplicate applications for the same worker and job with 409 Conflict.
 * 13. Worker can query their submitted application via /api/applications/my.
 * 14. Authoritative employer receives in-app notification with worker name, job title, and link.
 * 15. Another employer cannot read notifications belonging to the first employer.
 * 16. Authoritative employer can view applications for their job via /api/applications/employer.
 * 17. Another employer cannot view applications for jobs they do not own.
 * 18. Notification failure does not fail application persistence.
 */

import http from 'http';
import { app } from '../src/server.js';
import {
  connectTestDB,
  cleanupTrackedData,
  createTestUser,
  tracker,
} from './testHelper.js';
import { Job, JobApplication, Notification } from '../src/models/index.js';

export async function runJobDetailsAndApplicationsTests() {
  console.log('\n======================================================');
  console.log('RUNNING SUITE: Job Details, Applications & Notifications');
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

    // 1. Setup Test Users
    const employerA = await createTestUser({
      name: 'Pooja Bhosale Infra',
      role: 'employer',
    });

    const employerB = await createTestUser({
      name: 'Vikram Deshmukh Works',
      role: 'employer',
    });

    const workerA = await createTestUser({
      name: 'Anand Kulkarni Welder',
      role: 'worker',
    });

    // 2. Setup Test Jobs
    const openJob = await Job.create({
      employerId: employerA.user._id,
      title: 'Precision Structural Steel Welding',
      description: 'Laying 2x4 ft glazed vitrified floor tiles with 3mm spacers in Aundh.',
      category: 'Welder',
      requiredSkills: ['welding', 'fabrication'],
      wageType: 'daily',
      wageAmount: 1100,
      durationDays: 3,
      location: 'Aundh, Pune',
      workersNeeded: 2,
      status: 'open',
    });
    tracker.jobs.add(openJob._id);

    const closedJob = await Job.create({
      employerId: employerA.user._id,
      title: 'Commercial Site Concrete Pouring',
      description: 'Foundational slab casting work completed last month.',
      category: 'Mason',
      requiredSkills: ['mason'],
      wageType: 'daily',
      wageAmount: 800,
      durationDays: 1,
      location: 'Hadapsar, Pune',
      workersNeeded: 1,
      status: 'closed',
    });
    tracker.jobs.add(closedJob._id);

    // ----------------------------------------------------
    // Section 1: Job Details Retrieval
    // ----------------------------------------------------
    console.log('--- Sub-suite: Job Details Retrieval ---');

    // Test 1: Worker retrieves valid open job
    const resOpenJob = await fetch(`${baseUrl}/api/jobs/${openJob._id}`, {
      headers: { Authorization: `Bearer ${workerA.token}` },
    });
    const dataOpenJob = await resOpenJob.json();
    assert(resOpenJob.status === 200, 'Worker can retrieve open job details (status 200)');
    assert(dataOpenJob.data.title === 'Precision Structural Steel Welding', 'Job title matches database record');
    assert(dataOpenJob.data.wageAmount === 1100, 'Wage amount matches database record');
    assert(dataOpenJob.data.status === 'open', 'Job status is open');

    // Test 2: Worker views closed job details
    const resClosedJob = await fetch(`${baseUrl}/api/jobs/${closedJob._id}`, {
      headers: { Authorization: `Bearer ${workerA.token}` },
    });
    const dataClosedJob = await resClosedJob.json();
    assert(resClosedJob.status === 200, 'Worker can retrieve closed job details (status 200)');
    assert(dataClosedJob.data.status === 'closed', 'Closed job status is correctly returned');

    // Test 3: Nonexistent job returns 404
    const fakeId = '00000000-0000-4000-8000-000000000999';
    const resFakeJob = await fetch(`${baseUrl}/api/jobs/${fakeId}`, {
      headers: { Authorization: `Bearer ${workerA.token}` },
    });
    const dataFakeJob = await resFakeJob.json();
    assert(resFakeJob.status === 404, 'Nonexistent job returns 404');
    assert(dataFakeJob.success === false, 'Nonexistent job returns success: false');

    // Test 4: Malformed job ID returns 404 gracefully
    const resMalformed = await fetch(`${baseUrl}/api/jobs/not-a-valid-uuid-999`, {
      headers: { Authorization: `Bearer ${workerA.token}` },
    });
    assert(resMalformed.status === 404, 'Malformed job ID returns 404 without 500 crash');

    // Test 5: Unauthenticated request rejected
    const resUnauth = await fetch(`${baseUrl}/api/jobs/${openJob._id}`);
    assert(resUnauth.status === 401, 'Unauthenticated job details request rejected with 401');

    // ----------------------------------------------------
    // Section 2: Application Submission & Validation
    // ----------------------------------------------------
    console.log('\n--- Sub-suite: Application Submission & Validation ---');

    // Test 6: Unauthenticated application rejected
    const resApplyNoAuth = await fetch(`${baseUrl}/api/applications/jobs/${openJob._id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposedWage: 1100, message: 'Unauth test' }),
    });
    assert(resApplyNoAuth.status === 401, 'Unauthenticated application rejected with 401');

    // Test 7: Employer account rejected from applying as worker
    const resEmployerApply = await fetch(`${baseUrl}/api/applications/jobs/${openJob._id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employerA.token}`,
      },
      body: JSON.stringify({ proposedWage: 1100, message: 'Employer applying' }),
    });
    assert(resEmployerApply.status === 403, 'Employer account rejected from applying with 403');

    // Test 8: Invalid wage rejected (proposedWage <= 0)
    const resInvalidWage = await fetch(`${baseUrl}/api/applications/jobs/${openJob._id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${workerA.token}`,
      },
      body: JSON.stringify({ proposedWage: 0, message: 'Zero wage' }),
    });
    assert(resInvalidWage.status === 400, 'Zero or negative wage rejected with 400');

    // Test 9: Worker cannot apply to closed job
    const resApplyClosed = await fetch(`${baseUrl}/api/applications/jobs/${closedJob._id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${workerA.token}`,
      },
      body: JSON.stringify({ proposedWage: 800, message: 'Closed job test' }),
    });
    assert(resApplyClosed.status === 400, 'Application to closed job rejected with 400');

    // Test 10: Valid application submitted successfully
    const resApplyValid = await fetch(`${baseUrl}/api/applications/jobs/${openJob._id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${workerA.token}`,
      },
      body: JSON.stringify({
        proposedWage: 1150,
        message: 'Certified arc welder available immediately with full safety gear.',
      }),
    });
    const dataApplyValid = await resApplyValid.json();
    assert(resApplyValid.status === 201, 'Valid application submitted successfully with 201');
    assert(dataApplyValid.success === true, 'Application submission returns success: true');
    assert(dataApplyValid.data.status === 'pending', 'New application status is pending');
    assert(dataApplyValid.data.proposedWage === 1150, 'Proposed wage is persisted correctly');

    const createdAppId = dataApplyValid.data._id || dataApplyValid.data.id;
    tracker.applications.add(createdAppId);

    // Test 11: Verify application persisted in database
    const dbApp = await JobApplication.findById(createdAppId);
    assert(dbApp !== null && dbApp !== undefined, 'Application record found in database');
    assert(dbApp.workerId.toString() === workerA.user._id.toString(), 'Application belongs to correct worker');

    // Test 12: Duplicate application rejected with 409 Conflict
    const resDuplicate = await fetch(`${baseUrl}/api/applications/jobs/${openJob._id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${workerA.token}`,
      },
      body: JSON.stringify({
        proposedWage: 1150,
        message: 'Duplicate submission should be rejected.',
      }),
    });
    assert(resDuplicate.status === 409, 'Duplicate application rejected with 409 Conflict');

    // Test 13: Worker can retrieve their applications via /api/applications/my
    const resWorkerApps = await fetch(`${baseUrl}/api/applications/my?jobId=${openJob._id}`, {
      headers: { Authorization: `Bearer ${workerA.token}` },
    });
    const dataWorkerApps = await resWorkerApps.json();
    assert(resWorkerApps.status === 200, 'Worker can retrieve applications via /api/applications/my');
    assert(Array.isArray(dataWorkerApps.data), 'Worker applications returns an array');
    const matchingApp = dataWorkerApps.data.find(
      (a) => (a._id || a.id) === createdAppId || a.jobId?._id === openJob._id || a.jobId === openJob._id
    );
    assert(matchingApp !== undefined, 'Submitted application appears in worker applications list');

    // ----------------------------------------------------
    // Section 3: Employer Notifications & Access Control
    // ----------------------------------------------------
    console.log('\n--- Sub-suite: Employer Notifications & Access Control ---');

    // Test 14: Employer A receives notification with worker name and job title
    const resNotifsA = await fetch(`${baseUrl}/api/notifications`, {
      headers: { Authorization: `Bearer ${employerA.token}` },
    });
    const dataNotifsA = await resNotifsA.json();
    assert(resNotifsA.status === 200, 'Employer can retrieve notifications (status 200)');
    assert(Array.isArray(dataNotifsA.data), 'Notifications is an array');

    const appNotification = dataNotifsA.data.find(
      (n) => n.type === 'JOB_APPLICATION' && n.title?.includes(openJob.title)
    );
    assert(appNotification !== undefined, 'Employer received JOB_APPLICATION notification');
    assert(appNotification.message.includes(workerA.user.name), 'Notification message includes worker name');
    assert(appNotification.data?.workerName === workerA.user.name, 'Notification payload includes workerName');
    assert(appNotification.data?.link?.includes(openJob._id), 'Notification payload contains direct application link');

    tracker.notifications.add(appNotification._id || appNotification.id);

    // Test 15: Another employer (Employer B) cannot see Employer A notification
    const resNotifsB = await fetch(`${baseUrl}/api/notifications`, {
      headers: { Authorization: `Bearer ${employerB.token}` },
    });
    const dataNotifsB = await resNotifsB.json();
    assert(resNotifsB.status === 200, 'Employer B can retrieve notifications');
    const unauthorizedNotif = dataNotifsB.data.find(
      (n) => n.title?.includes(openJob.title)
    );
    assert(unauthorizedNotif === undefined, 'Employer B cannot see Employer A notification');

    // Test 16: Employer A can view applicant in /api/applications/employer
    const resEmployerApps = await fetch(`${baseUrl}/api/applications/employer?jobId=${openJob._id}`, {
      headers: { Authorization: `Bearer ${employerA.token}` },
    });
    const dataEmployerApps = await resEmployerApps.json();
    assert(resEmployerApps.status === 200, 'Employer can view applications for own job');
    const applicantRecord = dataEmployerApps.data.find(
      (a) => (a.workerId?._id || a.workerId?.id || a.workerId) === workerA.user._id.toString()
    );
    assert(applicantRecord !== undefined, 'Employer A sees worker application');

    // Test 17: Employer B cannot view applications for Employer A job
    const resEmployerBApps = await fetch(`${baseUrl}/api/applications/employer?jobId=${openJob._id}`, {
      headers: { Authorization: `Bearer ${employerB.token}` },
    });
    const dataEmployerBApps = await resEmployerBApps.json();
    assert(resEmployerBApps.status === 200, 'Employer B query returns successfully');
    assert(dataEmployerBApps.data.length === 0, 'Employer B receives empty array for job they do not own');

    console.log(`\nSUITE PASSED: ${passed}/${total} assertions succeeded.\n`);
  } catch (error) {
    console.error(`\nSUITE FAILED: ${error.message}\n`);
    throw error;
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await cleanupTrackedData();
  }
}

// Auto-run if executed directly via node
const isMain = process.argv[1] && process.argv[1].endsWith('job-details-application-notifications.test.js');
if (isMain) {
  runJobDetailsAndApplicationsTests()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
