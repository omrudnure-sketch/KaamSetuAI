import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDB } from './src/config/db.js';
import {
  User,
  WorkerProfile,
  EmployerProfile,
  Job,
  HiringAgreement,
  Project,
  ProjectWorker,
  Attendance,
  ProgressUpdate,
  ProjectExtension,
  Review,
  Complaint,
  Dispute,
} from './src/models/index.js';
import {
  summaryOutputSchema,
  summarizeProjectProgress,
  summarizeWorkerHistory,
  summarizeEmployerHistory,
  summarizeComplaint,
  summarizeDispute,
} from './src/services/ai/summaryService.js';

async function runStep25Tests() {
  console.log('==================================================');
  console.log('--- STARTING STEP 25 VERIFICATION TESTS (AI SUMMARIES) ---');
  console.log('==================================================');
  await connectDB();

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  const cleanupUserIds = [];
  const cleanupProjectIds = [];
  const cleanupComplaintIds = [];
  const cleanupDisputeIds = [];

  try {
    // -------------------------------------------------------------------
    // Setup Test Fixtures: Employer, Worker, Job, HiringAgreement, Project
    // -------------------------------------------------------------------
    console.log('\n--- Setting up Test Data in MongoDB ---');
    const timestamp = Date.now();

    const testEmployer = await User.create({
      name: 'Ramesh Builder',
      email: `ramesh_emp_${timestamp}@kaamsetu.test`,
      password: 'hashed_password_secret_123',
      role: 'employer',
      status: 'active',
    });
    cleanupUserIds.push(testEmployer._id);

    const testEmployerProfile = await EmployerProfile.create({
      userId: testEmployer._id,
      name: 'Ramesh Builder',
      businessName: 'Ramesh Construction Pune',
      businessType: 'contractor',
      location: { city: 'Pune', area: 'Kothrud' },
      rating: 4.6,
      totalReviews: 8,
      completedProjects: 5,
    });

    const testWorker = await User.create({
      name: 'Suresh Electrician',
      email: `suresh_wrk_${timestamp}@kaamsetu.test`,
      password: 'hashed_password_secret_456',
      role: 'worker',
      status: 'active',
    });
    cleanupUserIds.push(testWorker._id);

    const testWorkerProfile = await WorkerProfile.create({
      userId: testWorker._id,
      fullName: 'Suresh Patil',
      primarySkill: 'electrician',
      skills: ['wiring', 'lighting', 'breaker repair'],
      experienceYears: 6,
      dailyWage: 900,
      verificationStatus: 'verified',
      rating: 4.9,
      totalReviews: 12,
      completedProjects: 10,
      location: { city: 'Pune', area: 'Hadapsar' },
    });

    const testUnauthorizedUser = await User.create({
      name: 'Unauthorized Stranger',
      email: `stranger_${timestamp}@kaamsetu.test`,
      role: 'worker',
      status: 'active',
    });
    cleanupUserIds.push(testUnauthorizedUser._id);

    const testJob = await Job.create({
      employerId: testEmployer._id,
      title: 'Commercial Office Electrification',
      description: 'Commercial electrical cabling and panel setup in IT park',
      skillRequired: 'electrician',
      workersRequired: 1,
      wageType: 'daily',
      wageAmount: 900,
      durationType: 'fixed_duration',
      startDate: new Date('2026-10-01'),
      location: { city: 'Pune', area: 'Hadapsar' },
      status: 'open',
    });

    const testAgreement = await HiringAgreement.create({
      jobId: testJob._id,
      employerId: testEmployer._id,
      workerId: testWorker._id,
      sourceType: 'application',
      sourceId: new mongoose.Types.ObjectId(),
      durationType: 'fixed_duration',
      proposedWage: 900,
      agreedWage: 900,
      wageType: 'daily',
      startDate: new Date('2026-10-01'),
      status: 'confirmed',
    });

    const testProject = await Project.create({
      jobId: testJob._id,
      employerId: testEmployer._id,
      createdFromHiringAgreement: testAgreement._id,
      name: 'Hadapsar Commercial Complex Electrification',
      description: 'Full conduit and board installation for IT facility',
      projectType: 'fixed_duration',
      durationType: 'fixed_duration',
      startDate: new Date('2026-10-01'),
      originalEstimatedEndDate: new Date('2026-10-20'),
      currentExpectedEndDate: new Date('2026-10-25'), // 5 days extension
      paymentType: 'daily',
      paymentAmount: 900,
      progressPercentage: 65,
      status: 'in_progress',
    });
    cleanupProjectIds.push(testProject._id);

    const testProjectWorker = await ProjectWorker.create({
      projectId: testProject._id,
      workerId: testWorker._id,
      hiringAgreementId: testAgreement._id,
      agreedWage: 900,
      wageType: 'daily',
      startDate: new Date('2026-10-01'),
      status: 'active',
    });

    // Add attendance: 4 days present
    await Attendance.create([
      {
        projectId: testProject._id,
        projectWorkerId: testProjectWorker._id,
        workerId: testWorker._id,
        employerId: testEmployer._id,
        date: '2026-10-01',
        status: 'present',
      },
      {
        projectId: testProject._id,
        projectWorkerId: testProjectWorker._id,
        workerId: testWorker._id,
        employerId: testEmployer._id,
        date: '2026-10-02',
        status: 'present',
      },
      {
        projectId: testProject._id,
        projectWorkerId: testProjectWorker._id,
        workerId: testWorker._id,
        employerId: testEmployer._id,
        date: '2026-10-03',
        status: 'present',
      },
      {
        projectId: testProject._id,
        projectWorkerId: testProjectWorker._id,
        workerId: testWorker._id,
        employerId: testEmployer._id,
        date: '2026-10-04',
        status: 'present',
      },
    ]);

    // Add progress update with conflicting expected date (e.g. 2026-10-30 vs 2026-10-25) and a blocker
    await ProgressUpdate.create({
      projectId: testProject._id,
      projectWorkerId: testProjectWorker._id,
      workerId: testWorker._id,
      date: '2026-10-04',
      percentage: 65,
      description: 'Second floor wiring completed, waiting on main breaker delivery from supplier',
      tasksCompleted: ['Conduit routing', 'Distribution board assembly'],
      blockers: ['Awaiting heavy-duty 63A circuit breaker unit delivery'],
      expectedCompletionDate: new Date('2026-10-30'), // Conflicting with currentExpectedEndDate (2026-10-25)
    });

    // Add approved project extension
    await ProjectExtension.create({
      projectId: testProject._id,
      requestedBy: testEmployer._id,
      previousEndDate: new Date('2026-10-20'),
      requestedEndDate: new Date('2026-10-25'),
      reason: 'Extra lighting points added by interior architect',
      workerApproval: 'approved',
      employerApproval: 'approved',
      status: 'approved',
    });

    // ----------------------------------------------------
    // Test 1: Project Progress Summary reflects actual records
    // ----------------------------------------------------
    console.log('\n--- 1. Testing Project Progress Summary with Real MongoDB Data ---');
    const projectSummary = await summarizeProjectProgress(testProject._id, {
      userId: testEmployer._id,
      role: 'employer',
    });

    assert(summaryOutputSchema.safeParse(projectSummary).success, 'Project summary conforms to Zod summaryOutputSchema');
    assert(projectSummary.summary.includes('65%') || projectSummary.keyPoints.some((k) => k.includes('65%')), 'Summary accurately reflects recorded 65% progress');
    assert(projectSummary.blockers.some((b) => b.includes('circuit breaker')), 'Summary contains actual recorded blocker');
    assert(projectSummary.keyPoints.some((k) => k.includes('4 days logged')), 'Verified attendance records count matches 4 days');

    // ----------------------------------------------------
    // Test 2: Missing information is honestly reported as missing
    // ----------------------------------------------------
    console.log('\n--- 2. Testing Missing Information Disclosure ---');
    // Create an empty project without progress updates or attendance
    const emptyProject = await Project.create({
      jobId: testJob._id,
      employerId: testEmployer._id,
      createdFromHiringAgreement: testAgreement._id,
      name: 'Brand New Raw Site Project',
      durationType: 'fixed_duration',
      startDate: new Date('2026-11-01'),
      paymentType: 'daily',
      paymentAmount: 800,
      status: 'confirmed',
    });
    cleanupProjectIds.push(emptyProject._id);

    const emptySummary = await summarizeProjectProgress(emptyProject._id, {
      userId: testEmployer._id,
      role: 'employer',
    });

    assert(
      emptySummary.missingInformation.some((m) => m.toLowerCase().includes('no daily progress')),
      'Missing daily progress updates honestly reported in missingInformation'
    );
    assert(
      emptySummary.missingInformation.some((m) => m.toLowerCase().includes('no attendance')),
      'Missing attendance records honestly reported in missingInformation'
    );

    // ----------------------------------------------------
    // Test 3: Conflicting dates are explicitly disclosed
    // ----------------------------------------------------
    console.log('\n--- 3. Testing Conflicting Dates Disclosure ---');
    const hasDiscrepancyMention =
      projectSummary.keyPoints.some((k) => k.toLowerCase().includes('discrepancy') || k.toLowerCase().includes('conflict')) ||
      projectSummary.summary.toLowerCase().includes('discrepancy') ||
      projectSummary.summary.toLowerCase().includes('conflict');
    assert(hasDiscrepancyMention, 'Conflicting completion dates between progress and agreement are explicitly flagged');

    // ----------------------------------------------------
    // Test 4: Complaint Summary distinguishes allegations from facts
    // ----------------------------------------------------
    console.log('\n--- 4. Testing Complaint Summary & Allegation Separation ---');
    const testComplaint = await Complaint.create({
      reporterId: testEmployer._id,
      targetUserId: testWorker._id,
      projectId: testProject._id,
      category: 'attendance',
      priority: 'medium',
      description: 'Worker allegedly arrived 2 hours late on Monday without informing supervisor',
      status: 'under_review',
    });
    cleanupComplaintIds.push(testComplaint._id);

    const complaintSummary = await summarizeComplaint(testComplaint._id, {
      userId: testEmployer._id,
      role: 'employer',
    });

    assert(summaryOutputSchema.safeParse(complaintSummary).success, 'Complaint summary conforms to Zod schema');
    assert(
      complaintSummary.summary.toLowerCase().includes('allegation') ||
        complaintSummary.summary.toLowerCase().includes('alleged'),
      'Complaint summary labels claim as allegation'
    );
    assert(
      complaintSummary.summary.toLowerCase().includes('not been independently proven') ||
        complaintSummary.summary.toLowerCase().includes('claim'),
      'Summary clarifies allegations are not proven facts'
    );
    assert(
      complaintSummary.missingInformation.some((m) => m.toLowerCase().includes('evidence')),
      'Absence of evidence files explicitly noted under missingInformation'
    );

    // ----------------------------------------------------
    // Test 5: Dispute Summary distinguishes claims and does not rule
    // ----------------------------------------------------
    console.log('\n--- 5. Testing Dispute Summary & Neutrality ---');
    const testDispute = await Dispute.create({
      projectId: testProject._id,
      initiatedBy: testWorker._id,
      againstUserId: testEmployer._id,
      type: 'payment',
      amount: 1800,
      description: 'Two days of overtime work wage was deducted by employer during payout calculation',
      status: 'open',
    });
    cleanupDisputeIds.push(testDispute._id);

    const disputeSummary = await summarizeDispute(testDispute._id, {
      userId: testWorker._id,
      role: 'worker',
    });

    assert(summaryOutputSchema.safeParse(disputeSummary).success, 'Dispute summary conforms to Zod schema');
    assert(disputeSummary.keyPoints.some((k) => k.includes('₹1800')), 'Disputed sum of ₹1800 recorded');
    assert(
      disputeSummary.summary.toLowerCase().includes('ai does not make dispute rulings') ||
        disputeSummary.summary.toLowerCase().includes('administrative determination'),
      'Neutrality safeguard: AI does not make dispute rulings'
    );

    // ----------------------------------------------------
    // Test 6: Worker Work-History Summary
    // ----------------------------------------------------
    console.log('\n--- 6. Testing Worker Work-History Summary ---');
    const workerSummary = await summarizeWorkerHistory(testWorker._id, {
      userId: testEmployer._id,
      role: 'employer',
    });

    assert(summaryOutputSchema.safeParse(workerSummary).success, 'Worker summary conforms to Zod schema');
    assert(workerSummary.keyPoints.some((k) => k.includes('electrician')), 'Worker trade correctly identified as electrician');
    assert(workerSummary.keyPoints.some((k) => k.includes('6 year(s)')), 'Self-reported experience reflected honestly');

    // Test that workers with few reviews are not labeled unreliable
    const unreviewedWorker = await User.create({
      name: 'Fresh Helper',
      email: `fresh_${timestamp}@kaamsetu.test`,
      role: 'worker',
      status: 'active',
    });
    cleanupUserIds.push(unreviewedWorker._id);
    await WorkerProfile.create({
      userId: unreviewedWorker._id,
      fullName: 'Fresh Helper',
      primarySkill: 'helper',
      experienceYears: 1,
    });

    const freshSummary = await summarizeWorkerHistory(unreviewedWorker._id, {
      userId: unreviewedWorker._id,
      role: 'worker',
    });
    assert(
      !freshSummary.summary.toLowerCase().includes('unreliable'),
      'Workers with zero reviews are NEVER described as unreliable'
    );
    assert(
      freshSummary.missingInformation.some((m) => m.toLowerCase().includes('no client reviews')),
      'Limited review count stated neutrally as missing information'
    );

    // ----------------------------------------------------
    // Test 7: Employer History Summary
    // ----------------------------------------------------
    console.log('\n--- 7. Testing Employer History Summary ---');
    const employerSummary = await summarizeEmployerHistory(testEmployer._id, {
      userId: testEmployer._id,
      role: 'employer',
    });
    assert(summaryOutputSchema.safeParse(employerSummary).success, 'Employer summary conforms to Zod schema');
    assert(employerSummary.keyPoints.some((k) => k.includes('Ramesh Construction Pune') || k.includes('contractor')), 'Employer business profile details included');

    // ----------------------------------------------------
    // Test 8: Authorization & Object-Level Access Control
    // ----------------------------------------------------
    console.log('\n--- 8. Testing Authorization Checks ---');
    let projectAuthBlocked = false;
    try {
      await summarizeProjectProgress(testProject._id, {
        userId: testUnauthorizedUser._id,
        role: 'worker',
      });
    } catch (err) {
      if (err.status === 403) projectAuthBlocked = true;
    }
    assert(projectAuthBlocked, 'Unassigned worker is denied access (403 Forbidden) to private project summary');

    let complaintAuthBlocked = false;
    try {
      await summarizeComplaint(testComplaint._id, {
        userId: testUnauthorizedUser._id,
        role: 'worker',
      });
    } catch (err) {
      if (err.status === 403) complaintAuthBlocked = true;
    }
    assert(complaintAuthBlocked, 'Unauthorized stranger is denied access (403 Forbidden) to complaint summary');

    // ----------------------------------------------------
    // Test 9: Security: Passwords and Tokens are Never Exposed
    // ----------------------------------------------------
    console.log('\n--- 9. Testing Credential & Secret Protection ---');
    const fullSummaryJSON = JSON.stringify({ projectSummary, workerSummary, complaintSummary, disputeSummary });
    assert(!fullSummaryJSON.includes('hashed_password_secret'), 'Password hashes are strictly excluded from summaries');
    assert(!fullSummaryJSON.includes('kaamsetu_ai_super_secret'), 'Tokens and secrets are strictly excluded');

    // ----------------------------------------------------
    // Test 10: Timestamps and Source Freshness Indicators
    // ----------------------------------------------------
    console.log('\n--- 10. Testing Timestamps & Data Freshness ---');
    assert(!!projectSummary.generatedAt, 'generatedAt timestamp exists');
    assert(new Date(projectSummary.generatedAt).getTime() > 0, 'generatedAt is a valid ISO date');
    assert(!!projectSummary.sourceUpdatedAt, 'sourceUpdatedAt freshness indicator exists');

  } catch (err) {
    console.error('Unexpected test error in Step 25:', err);
    failed++;
  } finally {
    console.log('\nCleaning up test records...');
    try {
      if (cleanupProjectIds.length > 0) {
        await Project.deleteMany({ _id: { $in: cleanupProjectIds } });
        await ProjectWorker.deleteMany({ projectId: { $in: cleanupProjectIds } });
        await Attendance.deleteMany({ projectId: { $in: cleanupProjectIds } });
        await ProgressUpdate.deleteMany({ projectId: { $in: cleanupProjectIds } });
        await ProjectExtension.deleteMany({ projectId: { $in: cleanupProjectIds } });
      }
      if (cleanupComplaintIds.length > 0) {
        await Complaint.deleteMany({ _id: { $in: cleanupComplaintIds } });
      }
      if (cleanupDisputeIds.length > 0) {
        await Dispute.deleteMany({ _id: { $in: cleanupDisputeIds } });
      }
      if (cleanupUserIds.length > 0) {
        await User.deleteMany({ _id: { $in: cleanupUserIds } });
        await WorkerProfile.deleteMany({ userId: { $in: cleanupUserIds } });
        await EmployerProfile.deleteMany({ userId: { $in: cleanupUserIds } });
      }
    } catch (cleanupErr) {
      console.warn('Cleanup error:', cleanupErr.message);
    }
    await mongoose.connection.close();
  }

  console.log('\n==================================================');
  console.log(`STEP 25 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStep25Tests();
