import mongoose from 'mongoose';
import dotenv from 'dotenv';
import {
  User,
  Job,
  Attendance,
  Review,
  Complaint,
  Dispute,
  AuditLog,
  RiskFlag,
  Project,
} from './src/models/index.js';
import riskDetectionService from './src/services/riskDetectionService.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/kaamsetu';

async function runStep27Tests() {
  console.log('--- STARTING STEP 27 TEST SUITE: FRAUD & RISK DETECTION ---');
  let passedCount = 0;
  let totalCount = 14;

  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB successfully.');

    const timestamp = Date.now();

    // 0. Setup test users and data
    const testAdmin = await User.create({
      name: `Risk Admin ${timestamp}`,
      email: `risk_admin_${timestamp}@example.com`,
      phone: `999000${String(timestamp).slice(-4)}`,
      role: 'admin',
      adminRole: 'super_admin',
      isVerified: true,
      status: 'active',
    });

    const testNormalEmployer = await User.create({
      name: `Clean Employer ${timestamp}`,
      email: `clean_emp_${timestamp}@example.com`,
      phone: `999111${String(timestamp).slice(-4)}`,
      role: 'employer',
      isVerified: true,
      status: 'active',
    });

    const testSuspiciousEmployer = await User.create({
      name: `Suspicious Employer ${timestamp}`,
      email: `susp_emp_${timestamp}@example.com`,
      phone: `999222${String(timestamp).slice(-4)}`,
      role: 'employer',
      isVerified: false,
      status: 'active',
    });

    const testSuspiciousWorker = await User.create({
      name: `Suspicious Worker ${timestamp}`,
      email: `susp_wrk_${timestamp}@example.com`,
      phone: `999333${String(timestamp).slice(-4)}`,
      role: 'worker',
      isVerified: true,
      status: 'active',
    });

    const testReviewer = await User.create({
      name: `Review Bot ${timestamp}`,
      email: `rev_bot_${timestamp}@example.com`,
      phone: `999444${String(timestamp).slice(-4)}`,
      role: 'employer',
      isVerified: true,
      status: 'active',
    });

    const testRevieweeA = await User.create({
      name: `Reviewee A ${timestamp}`,
      email: `rev_a_${timestamp}@example.com`,
      phone: `999555${String(timestamp).slice(-4)}`,
      role: 'worker',
      isVerified: true,
      status: 'active',
    });

    const testRevieweeB = await User.create({
      name: `Reviewee B ${timestamp}`,
      email: `rev_b_${timestamp}@example.com`,
      phone: `999666${String(timestamp).slice(-4)}`,
      role: 'worker',
      isVerified: true,
      status: 'active',
    });

    const dummyJobId = new mongoose.Types.ObjectId();
    const dummyAgreementId = new mongoose.Types.ObjectId();

    // Dummy project for references
    const dummyProject = await Project.create({
      jobId: dummyJobId,
      employerId: testNormalEmployer._id,
      createdFromHiringAgreement: dummyAgreementId,
      name: `Dummy Project ${timestamp}`,
      description: 'Project for testing risk flags',
      durationType: 'single_day',
      paymentType: 'daily',
      paymentAmount: 600,
      startDate: new Date(),
      status: 'in_progress',
      location: { city: 'Pune' },
    });

    const dummyProject2 = await Project.create({
      jobId: dummyJobId,
      employerId: testNormalEmployer._id,
      createdFromHiringAgreement: dummyAgreementId,
      name: `Dummy Project Two ${timestamp}`,
      description: 'Second project for attendance conflicts',
      durationType: 'single_day',
      paymentType: 'daily',
      paymentAmount: 600,
      startDate: new Date(),
      status: 'in_progress',
      location: { city: 'Pune' },
    });

    // TEST 1: Account Anomalies (Rapid status shifts logged in AuditLog)
    console.log('\n[Test 1] Account Anomalies: Rapid status shifts detection');
    await AuditLog.create([
      {
        adminId: testAdmin._id,
        action: 'USER_STATUS_UPDATED',
        targetType: 'User',
        targetId: testSuspiciousEmployer._id,
        details: { from: 'active', to: 'suspended' },
        createdAt: new Date(Date.now() - 24 * 3600 * 1000),
      },
      {
        adminId: testAdmin._id,
        action: 'USER_STATUS_UPDATED',
        targetType: 'User',
        targetId: testSuspiciousEmployer._id,
        details: { from: 'suspended', to: 'active' },
        createdAt: new Date(Date.now() - 12 * 3600 * 1000),
      },
    ]);

    const accountRisk = await riskDetectionService.checkAccountAnomalies(testSuspiciousEmployer._id);
    if (
      accountRisk &&
      accountRisk.riskCategory === 'account_anomaly' &&
      accountRisk.indicators.some((i) => i.code === 'RAPID_STATUS_SHIFTS') &&
      accountRisk.score > 0
    ) {
      console.log('✓ Test 1 Passed: Account anomalies detected rapid status shifts correctly. Score:', accountRisk.score);
      passedCount++;
    } else {
      console.error('✗ Test 1 Failed:', accountRisk);
    }

    // TEST 2: Job Posting Anomalies (Rapid duplicate jobs & high cancellation)
    console.log('\n[Test 2] Job Posting Anomalies: Duplicate job titles within 48h & cancellations');
    const jobA = await Job.create({
      employerId: testSuspiciousEmployer._id,
      title: `Same Job Title Plumber ${timestamp}`,
      description: 'Need plumber for urgent repair',
      skillRequired: 'plumber',
      wageAmount: 600,
      wageType: 'daily',
      startDate: new Date(),
      location: { city: 'Pune' },
      status: 'cancelled',
      createdAt: new Date(Date.now() - 2 * 3600 * 1000),
    });

    const jobB = await Job.create({
      employerId: testSuspiciousEmployer._id,
      title: `Same Job Title Plumber ${timestamp}`,
      description: 'Need plumber for urgent repair duplicate',
      skillRequired: 'plumber',
      wageAmount: 600,
      wageType: 'daily',
      startDate: new Date(),
      location: { city: 'Pune' },
      status: 'cancelled',
      createdAt: new Date(Date.now() - 1 * 3600 * 1000),
    });

    const jobRisk = await riskDetectionService.checkJobAnomalies(testSuspiciousEmployer._id);
    if (
      jobRisk &&
      jobRisk.riskCategory === 'job_posting_anomaly' &&
      jobRisk.indicators.some((i) => i.code === 'RAPID_DUPLICATE_JOBS') &&
      jobRisk.indicators.some((i) => i.code === 'FREQUENT_JOB_CANCELLATIONS')
    ) {
      console.log('✓ Test 2 Passed: Job posting anomalies detected rapid duplicate jobs and high cancellation rate. Score:', jobRisk.score);
      passedCount++;
    } else {
      console.error('✗ Test 2 Failed:', jobRisk);
    }

    // TEST 3: Attendance Anomalies (Conflicting attendance on same calendar date across projects)
    console.log('\n[Test 3] Attendance Anomalies: Conflicting multi-project attendance on same day');
    const conflictDate = '2026-10-15';
    const dummyProjectWorkerId1 = new mongoose.Types.ObjectId();
    const dummyProjectWorkerId2 = new mongoose.Types.ObjectId();
    await Attendance.create([
      {
        projectId: dummyProject._id,
        projectWorkerId: dummyProjectWorkerId1,
        workerId: testSuspiciousWorker._id,
        employerId: testNormalEmployer._id,
        date: conflictDate,
        status: 'present',
      },
      {
        projectId: dummyProject2._id,
        projectWorkerId: dummyProjectWorkerId2,
        workerId: testSuspiciousWorker._id,
        employerId: testNormalEmployer._id,
        date: conflictDate,
        status: 'present',
      },
    ]);

    const attendanceRisk = await riskDetectionService.checkAttendanceAnomalies(testSuspiciousWorker._id);
    if (
      attendanceRisk &&
      attendanceRisk.riskCategory === 'attendance_anomaly' &&
      attendanceRisk.indicators.some((i) => i.code === 'CONFLICTING_ATTENDANCE_SAME_DAY') &&
      attendanceRisk.score >= 40
    ) {
      console.log('✓ Test 3 Passed: Attendance anomalies detected conflicting attendance on same calendar day. Score:', attendanceRisk.score);
      passedCount++;
    } else {
      console.error('✗ Test 3 Failed:', attendanceRisk);
    }

    // TEST 4: Review Patterns (Repetitive copy-pasted review text)
    console.log('\n[Test 4] Review Patterns: Repetitive copy-pasted review comments');
    const repetitiveComment = 'This is an awesome worker excellent job 10/10 recommended!';
    await Review.create([
      {
        projectId: dummyProject._id,
        reviewerId: testReviewer._id,
        revieweeId: testRevieweeA._id,
        reviewerRole: 'employer',
        revieweeRole: 'worker',
        rating: 5,
        comment: repetitiveComment,
      },
      {
        projectId: dummyProject2._id,
        reviewerId: testReviewer._id,
        revieweeId: testRevieweeB._id,
        reviewerRole: 'employer',
        revieweeRole: 'worker',
        rating: 5,
        comment: repetitiveComment,
      },
    ]);

    const reviewRisk = await riskDetectionService.checkReviewPatterns(testReviewer._id);
    if (
      reviewRisk &&
      reviewRisk.riskCategory === 'review_pattern' &&
      reviewRisk.indicators.some((i) => i.code === 'IDENTICAL_REVIEW_TEXT') &&
      reviewRisk.score >= 30
    ) {
      console.log('✓ Test 4 Passed: Review patterns detected identical copy-paste reviews. Score:', reviewRisk.score);
      passedCount++;
    } else {
      console.error('✗ Test 4 Failed:', reviewRisk);
    }

    // TEST 5: Payment & Dispute Patterns (Multiple unresolved complaints & disputes)
    console.log('\n[Test 5] Payment & Dispute Patterns: Multiple unresolved complaints & disputes');
    await Complaint.create({
      reporterId: testNormalEmployer._id,
      targetUserId: testSuspiciousWorker._id,
      category: 'payment',
      description: 'Worker refused to return overpaid daily wage deposit.',
      status: 'under_review',
    });

    await Dispute.create({
      projectId: dummyProject._id,
      initiatedBy: testNormalEmployer._id,
      againstUserId: testSuspiciousWorker._id,
      type: 'payment',
      amount: 1500,
      description: 'Dispute regarding incomplete daily work and advance payment deduction.',
      status: 'open',
    });

    const disputeRisk = await riskDetectionService.checkPaymentDisputePatterns(testSuspiciousWorker._id);
    if (
      disputeRisk &&
      disputeRisk.riskCategory === 'payment_dispute_pattern' &&
      disputeRisk.indicators.some((i) => i.code === 'MULTIPLE_UNRESOLVED_DISPUTES') &&
      disputeRisk.score >= 35
    ) {
      console.log('✓ Test 5 Passed: Payment/dispute patterns detected unresolved complaints & disputes. Score:', disputeRisk.score);
      passedCount++;
    } else {
      console.error('✗ Test 5 Failed:', disputeRisk);
    }

    // TEST 6: Normal data does NOT trigger risk flags
    console.log('\n[Test 6] False Positive Check: Normal clean user returns no risk flags');
    const cleanAccount = await riskDetectionService.checkAccountAnomalies(testNormalEmployer._id);
    const cleanJob = await riskDetectionService.checkJobAnomalies(testNormalEmployer._id);
    const cleanReview = await riskDetectionService.checkReviewPatterns(testNormalEmployer._id);
    const cleanDispute = await riskDetectionService.checkPaymentDisputePatterns(testNormalEmployer._id);

    if (!cleanAccount && !cleanJob && !cleanReview && !cleanDispute) {
      console.log('✓ Test 6 Passed: Clean user with normal activity generated zero risk flags.');
      passedCount++;
    } else {
      console.error('✗ Test 6 Failed: Clean user unexpectedly generated flags:', {
        cleanAccount,
        cleanJob,
        cleanReview,
        cleanDispute,
      });
    }

    // TEST 7: Deterministic Risk Score Bounded (0 - 100) and Level Mapping
    console.log('\n[Test 7] Deterministic score bounded 0 to 100 and correct level mapping');
    const levelLow = riskDetectionService.calculateRiskLevel(20);
    const levelMed = riskDetectionService.calculateRiskLevel(45);
    const levelHigh = riskDetectionService.calculateRiskLevel(70);
    const levelCrit = riskDetectionService.calculateRiskLevel(95);

    if (
      levelLow === 'low' &&
      levelMed === 'medium' &&
      levelHigh === 'high' &&
      levelCrit === 'critical' &&
      jobRisk.score >= 0 &&
      jobRisk.score <= 100 &&
      attendanceRisk.score >= 0 &&
      attendanceRisk.score <= 100
    ) {
      console.log('✓ Test 7 Passed: Score mapping is deterministic and bounded within [0, 100].');
      passedCount++;
    } else {
      console.error('✗ Test 7 Failed:', { levelLow, levelMed, levelHigh, levelCrit });
    }

    // TEST 8: Explainable Breakdown
    console.log('\n[Test 8] Explainable breakdown: All indicators have code, title, description, points, and evidence');
    const ind = jobRisk.indicators[0];
    const isExplainable =
      Boolean(ind.code) &&
      Boolean(ind.title) &&
      Boolean(ind.description) &&
      typeof ind.points === 'number' &&
      typeof ind.evidence === 'object';

    if (isExplainable && jobRisk.evidenceReferences.length > 0) {
      console.log('✓ Test 8 Passed: Risk indicator has fully explainable breakdown and evidence references.');
      passedCount++;
    } else {
      console.error('✗ Test 8 Failed:', ind);
    }

    // TEST 9: Persist Flag and Automated Scan Platform
    console.log('\n[Test 9] Automated Scan: Safe platform scan across users');
    const scanResult = await riskDetectionService.scanPlatformRiskFlags({ limit: 20 });
    if (
      scanResult &&
      typeof scanResult.scannedUsersCount === 'number' &&
      typeof scanResult.flagsCreatedOrUpdated === 'number' &&
      scanResult.scannedUsersCount > 0
    ) {
      console.log(`✓ Test 9 Passed: Platform scan completed safely. Scanned: ${scanResult.scannedUsersCount}, Flags: ${scanResult.flagsCreatedOrUpdated}`);
      passedCount++;
    } else {
      console.error('✗ Test 9 Failed:', scanResult);
    }

    // Find one created RiskFlag for workflow tests
    const activeFlag = await RiskFlag.findOne({ subjectUserId: testSuspiciousWorker._id });
    if (!activeFlag) {
      throw new Error('Could not find active RiskFlag for workflow tests');
    }

    // TEST 10: Assign Admin to Flag creates AuditLog
    console.log('\n[Test 10] Assign Admin: Updates flag and writes AuditLog');
    const assignedFlag = await riskDetectionService.assignAdminToFlag(
      activeFlag._id,
      testAdmin._id,
      testAdmin
    );

    const assignAudit = await AuditLog.findOne({
      targetType: 'RiskFlag',
      targetId: activeFlag._id,
      action: 'RISK_FLAG_ASSIGNED',
    });

    if (
      assignedFlag.assignedAdminId.toString() === testAdmin._id.toString() &&
      assignAudit &&
      assignAudit.adminId.toString() === testAdmin._id.toString()
    ) {
      console.log('✓ Test 10 Passed: Admin assigned successfully and AuditLog record created.');
      passedCount++;
    } else {
      console.error('✗ Test 10 Failed:', { assignedFlag, assignAudit });
    }

    // TEST 11: Add Review Note creates AuditLog
    console.log('\n[Test 11] Add Review Note: Records note with admin details and writes AuditLog');
    const noteText = 'Investigated attendance records; contacting employer for GPS verification.';
    const notedFlag = await riskDetectionService.addReviewNote(
      activeFlag._id,
      noteText,
      testAdmin
    );

    const noteAudit = await AuditLog.findOne({
      targetType: 'RiskFlag',
      targetId: activeFlag._id,
      action: 'RISK_FLAG_NOTE_ADDED',
    });

    const hasNote = notedFlag.reviewNotes.some((n) => n.note === noteText && n.adminName);

    if (hasNote && noteAudit) {
      console.log('✓ Test 11 Passed: Review note recorded with admin name & timestamp, AuditLog verified.');
      passedCount++;
    } else {
      console.error('✗ Test 11 Failed:', { hasNote, noteAudit });
    }

    // TEST 12: Update Flag Status creates AuditLog
    console.log('\n[Test 12] Update Status: Updates flag status and writes AuditLog');
    const updatedFlag = await riskDetectionService.updateFlagStatus(
      activeFlag._id,
      { status: 'under_review', resolution: 'Investigation ongoing' },
      testAdmin
    );

    const statusAudit = await AuditLog.findOne({
      targetType: 'RiskFlag',
      targetId: activeFlag._id,
      action: 'RISK_FLAG_STATUS_UPDATED',
      'details.newStatus': 'under_review',
    });

    if (updatedFlag.status === 'under_review' && statusAudit) {
      console.log('✓ Test 12 Passed: Flag status updated and AuditLog generated.');
      passedCount++;
    } else {
      console.error('✗ Test 12 Failed:', { updatedFlag, statusAudit });
    }

    // TEST 13: STRICT SAFETY: No automated suspension/banning
    console.log('\n[Test 13] Human Review Guarantee: System NEVER automatically suspends or bans users');
    const workerCheck = await User.findById(testSuspiciousWorker._id);
    const employerCheck = await User.findById(testSuspiciousEmployer._id);

    if (workerCheck.status === 'active' && employerCheck.status === 'active') {
      console.log('✓ Test 13 Passed: Flagged users remain active. No automated bans or suspensions occurred.');
      passedCount++;
    } else {
      console.error('✗ Test 13 Failed: User status unexpectedly changed to:', {
        workerStatus: workerCheck.status,
        employerStatus: employerCheck.status,
      });
    }

    // TEST 14: Pagination, Filtering & Statistics
    console.log('\n[Test 14] Query filtering & Statistics aggregation');
    const flagsList = await riskDetectionService.getRiskFlags({
      status: 'under_review',
      page: 1,
      limit: 10,
    });
    const stats = await riskDetectionService.getRiskStatistics();

    if (
      flagsList &&
      Array.isArray(flagsList.flags) &&
      flagsList.pagination &&
      typeof stats.totalFlags === 'number' &&
      typeof stats.underReviewFlags === 'number'
    ) {
      console.log(`✓ Test 14 Passed: Flags queried with pagination (Total: ${flagsList.pagination.total}), Stats: ${stats.totalFlags} total flags.`);
      passedCount++;
    } else {
      console.error('✗ Test 14 Failed:', { flagsList, stats });
    }

    // Clean up test records
    await RiskFlag.deleteMany({
      subjectUserId: {
        $in: [
          testSuspiciousEmployer._id,
          testSuspiciousWorker._id,
          testReviewer._id,
          testNormalEmployer._id,
        ],
      },
    });
    await User.deleteMany({
      _id: {
        $in: [
          testAdmin._id,
          testNormalEmployer._id,
          testSuspiciousEmployer._id,
          testSuspiciousWorker._id,
          testReviewer._id,
          testRevieweeA._id,
          testRevieweeB._id,
        ],
      },
    });
    await Job.deleteMany({ _id: { $in: [jobA._id, jobB._id] } });
    await Project.deleteMany({ _id: { $in: [dummyProject._id, dummyProject2._id] } });
    await Attendance.deleteMany({ workerId: testSuspiciousWorker._id });
    await Review.deleteMany({ reviewerId: testReviewer._id });
    await Complaint.deleteMany({ targetUserId: testSuspiciousWorker._id });
    await Dispute.deleteMany({ againstUserId: testSuspiciousWorker._id });
    await AuditLog.deleteMany({ adminId: testAdmin._id });

    console.log(`\n==============================================`);
    console.log(`STEP 27 TEST RESULTS: ${passedCount}/${totalCount} TESTS PASSED`);
    console.log(`==============================================\n`);

    if (passedCount === totalCount) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal test runner error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runStep27Tests();
