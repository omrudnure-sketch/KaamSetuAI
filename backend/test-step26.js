import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDB } from './src/config/db.js';
import {
  User,
  WorkerProfile,
  Job,
  Project,
  Payment,
  Complaint,
  Dispute,
  VerificationRecord,
  AdminAssistantConversation,
} from './src/models/index.js';
import {
  adminAssistantIntentSchema,
  adminQueryInputSchema,
  extractIntentDeterministically,
  executeApprovedAnalyticsTool,
  processAdminQuery,
  getAdminConversationHistory,
} from './src/services/ai/adminAssistantService.js';
import { getDashboardOverview, getDelayedProjects } from './src/services/adminDashboardService.js';

async function runStep26Tests() {
  console.log('==================================================');
  console.log('--- STARTING STEP 26 VERIFICATION TESTS (ADMIN AI ASSISTANT) ---');
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
  const cleanupConvIds = [];

  try {
    const timestamp = Date.now();

    // Setup Admin user
    const adminUser = await User.create({
      name: 'Super Admin Operational Lead',
      email: `admin_ai_${timestamp}@kaamsetu.test`,
      role: 'admin',
      adminRole: 'super_admin',
      permissions: ['analytics.read', 'projects.read', 'users.read', 'risk.read'],
      status: 'active',
    });
    cleanupUserIds.push(adminUser._id);

    // Setup Admin without analytics permission
    const restrictedAdmin = await User.create({
      name: 'Restricted Support Admin',
      email: `support_${timestamp}@kaamsetu.test`,
      role: 'admin',
      adminRole: 'support',
      permissions: ['complaints.read'], // Missing analytics.read
      status: 'active',
    });
    cleanupUserIds.push(restrictedAdmin._id);

    // Setup Worker and Employer (Unauthorized)
    const workerUser = await User.create({
      name: 'Unauthorized Worker',
      email: `worker_${timestamp}@kaamsetu.test`,
      role: 'worker',
      status: 'active',
    });
    cleanupUserIds.push(workerUser._id);

    const employerUser = await User.create({
      name: 'Unauthorized Employer',
      email: `employer_${timestamp}@kaamsetu.test`,
      role: 'employer',
      status: 'active',
    });
    cleanupUserIds.push(employerUser._id);

    // Seed a known delayed project
    const delayedProject = await Project.create({
      jobId: new mongoose.Types.ObjectId(),
      employerId: employerUser._id,
      createdFromHiringAgreement: new mongoose.Types.ObjectId(),
      name: 'Test Delayed Road Construction Site',
      durationType: 'fixed_duration',
      startDate: new Date('2026-08-01'),
      originalEstimatedEndDate: new Date('2026-08-30'),
      currentExpectedEndDate: new Date('2026-09-15'), // Overdue!
      paymentType: 'daily',
      paymentAmount: 850,
      status: 'in_progress',
    });
    cleanupProjectIds.push(delayedProject._id);

    // Seed an available electrician in Pune
    const testElectricianUser = await User.create({
      name: 'Santosh Pune Electrician',
      email: `santosh_elec_${timestamp}@kaamsetu.test`,
      role: 'worker',
      status: 'active',
    });
    cleanupUserIds.push(testElectricianUser._id);

    await WorkerProfile.create({
      userId: testElectricianUser._id,
      fullName: 'Santosh Jadhav',
      primarySkill: 'electrician',
      availability: 'available',
      verificationStatus: 'verified',
      location: { city: 'Pune' },
      experienceYears: 5,
      dailyWage: 950,
    });

    // ----------------------------------------------------
    // Test 1: Admin asks a supported analytics question
    // ----------------------------------------------------
    console.log('\n--- 1. Testing Supported Analytics Question: Delayed Projects ---');
    const delayedRes = await processAdminQuery({ question: 'Show delayed projects' }, adminUser);

    assert(delayedRes.intent === 'delayed_projects', 'Intent correctly extracted as "delayed_projects"');
    assert(typeof delayedRes.metrics.delayedCount === 'number', 'Returns numeric delayedCount');
    assert(delayedRes.metrics.delayedCount >= 1, 'Accurately detected at least 1 delayed project in DB');
    assert(delayedRes.answer.includes('delayed project'), 'Generated answer specifically explains delayed projects');
    assert(delayedRes.sources.includes('Project'), 'Sources explicitly declare Project model');

    // ----------------------------------------------------
    // Test 2: The response matches actual database analytics
    // ----------------------------------------------------
    console.log('\n--- 2. Testing Database-Backed Fact Alignment ---');
    const liveDelayedProjects = await getDelayedProjects();
    assert(
      delayedRes.metrics.delayedCount === liveDelayedProjects.length,
      `delayedCount (${delayedRes.metrics.delayedCount}) strictly matches getDelayedProjects (${liveDelayedProjects.length})`
    );

    // ----------------------------------------------------
    // Test 3: Available workers query by skill and city
    // ----------------------------------------------------
    console.log('\n--- 3. Testing Skill and City Analytics Inquiry ---');
    const workerCountRes = await processAdminQuery(
      { question: 'How many verified electricians are available in Pune?' },
      adminUser
    );

    assert(workerCountRes.intent === 'available_workers', 'Intent identified as "available_workers"');
    assert(workerCountRes.metrics.availableWorkersCount >= 1, 'Detects at least 1 available electrician in Pune');
    assert(workerCountRes.metrics.cityFilter?.toLowerCase() === 'pune', 'City filter correctly applied as Pune');
    assert(workerCountRes.metrics.skillFilter?.toLowerCase() === 'electrician', 'Skill filter correctly applied as electrician');

    // ----------------------------------------------------
    // Test 4: Verification backlog question
    // ----------------------------------------------------
    console.log('\n--- 4. Testing Verification Backlog Query ---');
    const backlogRes = await processAdminQuery(
      { question: 'How many workers are awaiting verification?' },
      adminUser
    );
    assert(backlogRes.intent === 'verification_backlog', 'Intent identified as "verification_backlog"');
    assert(typeof backlogRes.metrics.totalBacklog === 'number', 'Returns verified backlog numeric count');

    // ----------------------------------------------------
    // Test 5: Date filters applied correctly
    // ----------------------------------------------------
    console.log('\n--- 5. Testing Date Range Filter Extraction ---');
    const intent30d = extractIntentDeterministically('Show hiring conversion for the last 30 days');
    assert(intent30d.filters.dateRange === '30d', 'Filters extracted dateRange as "30d"');

    // ----------------------------------------------------
    // Test 6: Unsupported question receives a clear explanation
    // ----------------------------------------------------
    console.log('\n--- 6. Testing Unsupported / Out-of-Scope Questions ---');
    const unsupportedRes = await processAdminQuery(
      { question: 'What is the stock market forecast for next month?' },
      adminUser
    );
    assert(unsupportedRes.intent === 'unknown', 'Non-business inquiry classified as "unknown"');
    assert(
      unsupportedRes.answer.includes('cannot reliably answer') ||
        unsupportedRes.answer.includes('available platform analytics'),
      'Provides honest refusal with suggestions for supported topics'
    );

    // ----------------------------------------------------
    // Test 7: Action requests are denied with read-only safeguards
    // ----------------------------------------------------
    console.log('\n--- 7. Testing Read-Only Safeguard on Action Requests ---');
    const actionRes = await processAdminQuery(
      { question: 'Suspend user Santosh and delete project immediately' },
      adminUser
    );
    assert(actionRes.intent === 'action_request', 'Mutation command identified as "action_request"');
    assert(
      actionRes.answer.includes('read-only') && actionRes.answer.includes('management'),
      'Explains assistant is strictly read-only and directs admin to UI screens'
    );

    // Verify user was NOT modified or suspended
    const userStillActive = await User.findById(testElectricianUser._id);
    assert(userStillActive.status === 'active', 'User status remains active (Zero mutation executed)');

    // ----------------------------------------------------
    // Test 8: Zod Schema Security (No Arbitrary DB Operators or Unknown Intents)
    // ----------------------------------------------------
    console.log('\n--- 8. Testing Zod Intent Schema Strictness ---');
    let injectionRejected = false;
    try {
      adminAssistantIntentSchema.parse({
        intent: 'unauthorized_arbitrary_intent',
        filters: { $where: 'sleep(1000)' },
      });
    } catch (_err) {
      injectionRejected = true;
    }
    assert(injectionRejected, 'Arbitrary intent and MongoDB operators are rejected by Zod schema');

    // ----------------------------------------------------
    // Test 9: Conversation History Persistence
    // ----------------------------------------------------
    console.log('\n--- 9. Testing Conversation History Storage ---');
    const history = await getAdminConversationHistory(adminUser._id);
    assert(Array.isArray(history), 'History returns an array');
    assert(history.length >= 1, 'Stored conversation record found for admin');
    assert(history[history.length - 1].adminId.toString() === adminUser._id.toString(), 'History belongs to query admin');

    // ----------------------------------------------------
    // Test 10: Existing Admin Analytics APIs Remain Functional
    // ----------------------------------------------------
    console.log('\n--- 10. Testing Existing Analytics Service Co-existence ---');
    const overviewDirect = await getDashboardOverview();
    assert(!!overviewDirect.kpis, 'Existing getDashboardOverview() runs cleanly');
    assert(typeof overviewDirect.kpis.totalWorkers === 'number', 'Overview KPIs intact');

  } catch (err) {
    console.error('Unexpected test error in Step 26:', err);
    failed++;
  } finally {
    console.log('\nCleaning up test records...');
    try {
      if (cleanupProjectIds.length > 0) {
        await Project.deleteMany({ _id: { $in: cleanupProjectIds } });
      }
      if (cleanupUserIds.length > 0) {
        await User.deleteMany({ _id: { $in: cleanupUserIds } });
        await WorkerProfile.deleteMany({ userId: { $in: cleanupUserIds } });
        await AdminAssistantConversation.deleteMany({ adminId: { $in: cleanupUserIds } });
      }
    } catch (cleanupErr) {
      console.warn('Cleanup error:', cleanupErr.message);
    }
    await mongoose.connection.close();
  }

  console.log('\n==================================================');
  console.log(`STEP 26 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStep26Tests();
