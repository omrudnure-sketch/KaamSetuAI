/**
 * KaamSetu AI — Employer Job Details, Agreement Creation & Worker Contact Details
 * Regression Test Suite
 *
 * Verifies:
 * 1. Employer can retrieve valid job details with title, wage, duration, location, start date, skills.
 * 2. Missing optional fields (skillRequired, durationType, workersNeeded) normalized safely.
 * 3. Malformed job ID returns 404 without 500 crash.
 * 4. Nonexistent job returns 404 cleanly.
 * 5. Unauthorized employer cannot view another employer's job (404/403 isolation).
 * 6. Unauthenticated request to /api/jobs/my-jobs/:id returns 401.
 * 7. Admin can view employer job details.
 * 8. Valid hiring agreement proposal created from selected application, returns 201.
 * 9. Proposal persists in database with agreed_wage satisfying PostgreSQL NOT NULL schema constraint.
 * 10. Start date and estimated end date safely parsed and formatted.
 * 11. Initial proposal note persisted in terms column.
 * 12. Repeated/duplicate proposal for same job and worker returns existing active agreement.
 * 13. Rejects invalid wage (0 or negative) with 400.
 * 14. Rejects invalid date range with 400.
 * 15. Rejects unauthenticated agreement creation with 401.
 * 16. Rejects unauthorized employer proposing on another employer's application with 403.
 * 17. In-app notification created for worker upon proposal creation.
 * 18. Worker contact details (phone, email) HIDDEN while agreement is pending.
 * 19. Dedicated /contact endpoint rejects unconfirmed agreement with 403.
 * 20. Worker confirms proposal -> agreement status transitions to 'confirmed'.
 * 21. After mutual confirmation, employer can view worker contact details.
 * 22. After mutual confirmation, worker can view employer contact details.
 * 23. Unrelated Employer B cannot access contact details (403 Forbidden).
 * 24. Unauthenticated request to /contact returns 401 Unauthorized.
 * 25. Missing contact fields (e.g. phone or email null) handled safely without crash.
 */

import http from 'http';
import { app } from '../src/server.js';
import {
  connectTestDB,
  createTestUser,
  tracker,
} from './testHelper.js';
import { Job, JobApplication, HiringAgreement, Notification, User } from '../src/models/index.js';

export async function runEmployerJobsAndAgreementsTests() {
  console.log('\n======================================================');
  console.log('RUNNING SUITE: Employer Jobs, Agreements & Contacts');
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
    const { user: employerA, token: employerAToken } = await createTestUser({
      name: 'Rohan Deshmukh Builders',
      role: 'employer',
    });

    const { user: employerB, token: employerBToken } = await createTestUser({
      name: 'Unrelated Shinde Enterprises',
      role: 'employer',
    });

    const { user: worker1, token: worker1Token } = await createTestUser({
      name: 'Sunil Tukaram Kadam',
      role: 'worker',
      preferredLanguage: 'mr',
    });

    const { user: adminUser, token: adminToken } = await createTestUser({
      name: 'Super Admin Officer',
      role: 'admin',
      adminRole: 'super_admin',
    });

    // Helper request function
    const apiRequest = async (path, options = {}) => {
      const headers = {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...options.headers,
      };

      const res = await fetch(`${baseUrl}${path}`, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      const text = await res.text();
      let data = {};
      try {
        data = JSON.parse(text);
      } catch (_e) {
        data = { raw: text };
      }

      return { status: res.status, ok: res.ok, data };
    };

    // -------------------------------------------------------------------------
    // SUB-SUITE 1: Employer Job Details (/api/jobs/my-jobs/:id)
    // -------------------------------------------------------------------------
    console.log('--- Sub-suite 1: Employer Job Details Retrieval ---');

    // Create a job owned by employerA
    const jobA = await Job.create({
      employerId: employerA.id,
      title: 'Structural Steel Welding',
      description: 'Site welding for high-rise commercial beams.',
      category: 'Welder',
      requiredSkills: ['MIG Welding', 'Arc Welding'],
      wageType: 'daily',
      wageAmount: 950,
      durationDays: 5,
      location: { city: 'Pune', area: 'Kothrud', address: 'Plot 44 Paud Road' },
      workersNeeded: 2,
      status: 'open',
      startDate: new Date(Date.now() + 86400000).toISOString(),
    });
    tracker.jobs.add(jobA.id);

    // Test 1: Employer A retrieves their own job details
    const resJobA = await apiRequest(`/api/jobs/my-jobs/${jobA.id}`, { token: employerAToken });
    assert(resJobA.status === 200, 'Employer can retrieve own job details (status 200)');
    assert(resJobA.data.data.title === 'Structural Steel Welding', 'Job title matches database record');
    assert(resJobA.data.data.wageAmount === 950, 'Job wage matches database record');
    assert(resJobA.data.data.skillRequired === 'Welder', 'Missing skillRequired safely normalized to category');
    assert(resJobA.data.data.durationType === 'fixed_duration', 'Missing durationType safely normalized from durationDays');
    assert(resJobA.data.data.workersRequired === 2, 'Missing workersRequired safely normalized from workersNeeded');

    // Test 2: Employer B cannot view Employer A's job details (Isolation)
    const resJobIsolation = await apiRequest(`/api/jobs/my-jobs/${jobA.id}`, { token: employerBToken });
    assert(resJobIsolation.status === 404, 'Employer B is rejected with 404 when querying Employer A job');

    // Test 3: Unauthenticated request rejected
    const resJobUnauth = await apiRequest(`/api/jobs/my-jobs/${jobA.id}`);
    assert(resJobUnauth.status === 401, 'Unauthenticated request to /my-jobs/:id rejected with 401');

    // Test 4: Nonexistent job ID returns 404
    const resJobNonExistent = await apiRequest('/api/jobs/my-jobs/b1000000-0000-4000-8000-000000000999', { token: employerAToken });
    assert(resJobNonExistent.status === 404, 'Nonexistent job ID returns 404 cleanly');

    // Test 5: Malformed job ID returns 404 without 500 crash
    const resJobMalformed = await apiRequest('/api/jobs/my-jobs/invalid-not-a-uuid', { token: employerAToken });
    assert(resJobMalformed.status === 404, 'Malformed job ID returns 404 cleanly without 500 crash');

    // Test 6: Admin can view employer job
    const resJobAdmin = await apiRequest(`/api/jobs/my-jobs/${jobA.id}`, { token: adminToken });
    assert(resJobAdmin.status === 200, 'Admin can view employer job details (status 200)');

    // -------------------------------------------------------------------------
    // SUB-SUITE 2: Hiring Agreement Proposal Creation
    // -------------------------------------------------------------------------
    console.log('\n--- Sub-suite 2: Hiring Agreement Proposal Creation ---');

    // Create an application by worker1 for jobA
    const application1 = await JobApplication.create({
      jobId: jobA.id,
      workerId: worker1.id,
      proposedWage: 950,
      coverNote: 'Ready to join immediately with safety gear.',
      status: 'selected', // Selected status allows agreement proposal
    });
    tracker.applications.add(application1.id);

    // Test 7: Rejects unauthenticated proposal submission
    const resUnauthProp = await apiRequest('/api/hiring-agreements', {
      method: 'POST',
      body: {
        sourceType: 'application',
        sourceId: application1.id,
        durationType: 'fixed_duration',
        startDate: '2026-10-15',
        estimatedEndDate: '2026-10-20',
        wageType: 'daily',
        proposedWage: 950,
        message: 'Initial proposal terms note.',
      },
    });
    assert(resUnauthProp.status === 401, 'Unauthenticated agreement creation rejected with 401');

    // Test 8: Rejects unauthorized employer proposing on another employer's application
    const resWrongEmpProp = await apiRequest('/api/hiring-agreements', {
      method: 'POST',
      token: employerBToken,
      body: {
        sourceType: 'application',
        sourceId: application1.id,
        durationType: 'fixed_duration',
        startDate: '2026-10-15',
        estimatedEndDate: '2026-10-20',
        wageType: 'daily',
        proposedWage: 950,
        message: 'Unauthorized proposal.',
      },
    });
    assert(resWrongEmpProp.status === 403, 'Unauthorized employer proposing on another job rejected with 403');

    // Test 9: Rejects invalid wage (zero or negative)
    const resInvalidWage = await apiRequest('/api/hiring-agreements', {
      method: 'POST',
      token: employerAToken,
      body: {
        sourceType: 'application',
        sourceId: application1.id,
        durationType: 'fixed_duration',
        startDate: '2026-10-15',
        estimatedEndDate: '2026-10-20',
        wageType: 'daily',
        proposedWage: 0,
        message: 'Zero wage proposal.',
      },
    });
    assert(resInvalidWage.status === 400, 'Zero or negative proposed wage rejected with 400');

    // Test 10: Rejects invalid date range (estimatedEndDate before startDate)
    const resInvalidDates = await apiRequest('/api/hiring-agreements', {
      method: 'POST',
      token: employerAToken,
      body: {
        sourceType: 'application',
        sourceId: application1.id,
        durationType: 'fixed_duration',
        startDate: '2026-10-20',
        estimatedEndDate: '2026-10-15',
        wageType: 'daily',
        proposedWage: 950,
        message: 'Invalid dates.',
      },
    });
    assert(resInvalidDates.status === 400, 'estimatedEndDate before startDate rejected with 400');

    // Test 11: Valid proposal created successfully
    const resValidProp = await apiRequest('/api/hiring-agreements', {
      method: 'POST',
      token: employerAToken,
      body: {
        sourceType: 'application',
        sourceId: application1.id,
        durationType: 'fixed_duration',
        startDate: '2026-10-15',
        estimatedEndDate: '2026-10-20',
        wageType: 'daily',
        proposedWage: 950,
        workingHours: { start: '08:30', end: '17:30', description: 'Day shift' },
        message: 'Daily meal and transport provided on site.',
      },
    });
    assert(resValidProp.status === 201, 'Valid hiring agreement created with status 201');
    assert(resValidProp.data.success === true, 'Proposal creation returns success: true');
    assert(resValidProp.data.data.status === 'pending_worker', 'Agreement initialized with status pending_worker');

    const agreementId = resValidProp.data.data.id || resValidProp.data.data._id;
    tracker.agreements.add(agreementId);

    // Test 12: Verify database persistence
    const savedAgreement = await HiringAgreement.findById(agreementId);
    assert(savedAgreement !== null, 'Agreement record found in database');
    assert(Number(savedAgreement.agreedWage) === 950, 'agreedWage NUMERIC NOT NULL constraint satisfied with proposed wage');
    assert(savedAgreement.startDate.includes('2026-10-15'), 'Start date persisted cleanly in YYYY-MM-DD format');
    assert(savedAgreement.expectedEndDate.includes('2026-10-20'), 'Expected end date persisted cleanly in expected_end_date column');
    assert(savedAgreement.terms === 'Daily meal and transport provided on site.', 'Proposal note persisted in terms column');

    // Test 13: Prevent duplicate active proposal for same job and worker
    const resDupProp = await apiRequest('/api/hiring-agreements', {
      method: 'POST',
      token: employerAToken,
      body: {
        sourceType: 'application',
        sourceId: application1.id,
        durationType: 'fixed_duration',
        startDate: '2026-10-15',
        estimatedEndDate: '2026-10-20',
        wageType: 'daily',
        proposedWage: 950,
      },
    });
    assert(resDupProp.status === 201 || resDupProp.status === 200, 'Repeated proposal handled gracefully without database error');
    assert((resDupProp.data.data.id || resDupProp.data.data._id) === agreementId, 'Repeated proposal returns the existing agreement record');

    // Test 14: Worker received in-app notification for proposed agreement
    const workerNotifs = await Notification.find({ userId: worker1.id, type: 'HIRING_PROPOSED' });
    assert(workerNotifs.length >= 1, 'Worker received HIRING_PROPOSED notification');
    assert(workerNotifs[0].data?.proposedWage === 950, 'Notification data includes proposed wage');

    // -------------------------------------------------------------------------
    // SUB-SUITE 3: Worker Contact Visibility & Security
    // -------------------------------------------------------------------------
    console.log('\n--- Sub-suite 3: Worker Contact Details Visibility & Security ---');

    // Test 15: Contact details HIDDEN while agreement is pending_worker
    const resPendingDetail = await apiRequest(`/api/hiring-agreements/${agreementId}`, { token: employerAToken });
    assert(resPendingDetail.status === 200, 'Employer can view agreement details while pending (200)');
    assert(!resPendingDetail.data.data.workerId?.phone, 'Worker phone is HIDDEN while agreement is pending');
    assert(!resPendingDetail.data.data.workerId?.email, 'Worker email is HIDDEN while agreement is pending');
    assert(!resPendingDetail.data.data.workerContact, 'workerContact object is NOT present for unconfirmed agreement');

    // Test 16: Dedicated /contact endpoint rejects unconfirmed agreement with 403
    const resPendingContact = await apiRequest(`/api/hiring-agreements/${agreementId}/contact`, { token: employerAToken });
    assert(resPendingContact.status === 403, 'Dedicated /contact endpoint returns 403 Forbidden for pending agreement');

    // Test 17: Worker accepts the agreement terms
    const resAccept = await apiRequest(`/api/hiring-agreements/${agreementId}/accept`, {
      method: 'PATCH',
      token: worker1Token,
    });
    assert(resAccept.status === 200, 'Worker accepts agreement successfully (status 200)');
    assert(resAccept.data.data.status === 'confirmed', 'Agreement officially transitions to confirmed status');

    // Test 18: After confirmation, employer can view worker contact details via agreement detail
    const resConfirmedDetail = await apiRequest(`/api/hiring-agreements/${agreementId}`, { token: employerAToken });
    assert(resConfirmedDetail.status === 200, 'Employer can fetch confirmed agreement');
    assert(resConfirmedDetail.data.data.workerContact !== undefined, 'workerContact object is now attached for confirmed agreement');
    assert(resConfirmedDetail.data.data.workerContact.name === 'Sunil Tukaram Kadam', 'Worker name is present');
    assert(resConfirmedDetail.data.data.workerContact.phone === worker1.phone, 'Worker phone is verified and unlocked');
    assert(resConfirmedDetail.data.data.workerContact.email === worker1.email, 'Worker email is verified and unlocked');

    // Test 19: Employer can retrieve verified contact details via dedicated /contact endpoint
    const resConfirmedContact = await apiRequest(`/api/hiring-agreements/${agreementId}/contact`, { token: employerAToken });
    assert(resConfirmedContact.status === 200, 'Employer can retrieve contact details via /contact (status 200)');
    assert(resConfirmedContact.data.data.worker.phone === worker1.phone, 'Contact phone matches worker profile');
    assert(resConfirmedContact.data.data.worker.contactPreference === 'Phone', 'Contact preference derived appropriately');

    // Test 20: Worker can view employer contact details via dedicated /contact endpoint
    const resWorkerGetContact = await apiRequest(`/api/hiring-agreements/${agreementId}/contact`, { token: worker1Token });
    assert(resWorkerGetContact.status === 200, 'Worker can retrieve employer contact details (status 200)');
    assert(resWorkerGetContact.data.data.employer.name === 'Rohan Deshmukh Builders', 'Employer business name matches');
    assert(resWorkerGetContact.data.data.employer.phone === employerA.phone, 'Employer phone matches');

    // Test 21: Unrelated Employer B cannot access contact details (403 Forbidden)
    const resUnrelatedContact = await apiRequest(`/api/hiring-agreements/${agreementId}/contact`, { token: employerBToken });
    assert(resUnrelatedContact.status === 403, 'Unrelated Employer B rejected with 403 Forbidden when requesting contact details');

    // Test 22: Unauthenticated request to /contact rejected with 401
    const resUnauthContact = await apiRequest(`/api/hiring-agreements/${agreementId}/contact`);
    assert(resUnauthContact.status === 401, 'Unauthenticated request to /contact rejected with 401');

    // Test 23: Both parties received confirmation notifications
    const confirmedNotifs = await Notification.find({ type: 'HIRING_CONFIRMED' });
    assert(confirmedNotifs.length >= 2, 'Both employer and worker received HIRING_CONFIRMED notification');

    // Test 24: Missing contact information handled cleanly (phone/email null)
    const { user: workerNoPhone } = await createTestUser({
      name: 'Prakash Without Phone',
      role: 'worker',
    });
    await User.findByIdAndUpdate(workerNoPhone.id, { phone: null, email: null });

    const jobB = await Job.create({
      employerId: employerA.id,
      title: 'Helper Work',
      wageAmount: 700,
      status: 'open',
    });
    tracker.jobs.add(jobB.id);

    const appNoPhone = await JobApplication.create({
      jobId: jobB.id,
      workerId: workerNoPhone.id,
      proposedWage: 700,
      status: 'selected',
    });
    tracker.applications.add(appNoPhone.id);

    const agrNoPhone = await HiringAgreement.create({
      jobId: jobB.id,
      employerId: employerA.id,
      workerId: workerNoPhone.id,
      agreedWage: 700,
      proposedWage: 700,
      startDate: '2026-10-16',
      status: 'confirmed',
      employerAccepted: true,
      workerAccepted: true,
    });
    tracker.agreements.add(agrNoPhone.id);

    const resNoPhoneContact = await apiRequest(`/api/hiring-agreements/${agrNoPhone.id}/contact`, { token: employerAToken });
    assert(resNoPhoneContact.status === 200, 'Agreement with missing worker contact returns 200 without throwing');
    assert(resNoPhoneContact.data.data.worker.phone === null, 'Missing phone safely returned as null');
    assert(resNoPhoneContact.data.data.worker.email === null, 'Missing email safely returned as null');

    console.log(`\n======================================================`);
    console.log(`SUITE COMPLETE: All ${passed}/${total} assertions PASSED!`);
    console.log(`======================================================\n`);
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  }
}

// Allow standalone execution: node tests/employer-jobs-agreements-contacts.test.js
if (process.argv[1]?.includes('employer-jobs-agreements-contacts.test.js')) {
  runEmployerJobsAndAgreementsTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Test suite failed:', err);
      process.exit(1);
    });
}
