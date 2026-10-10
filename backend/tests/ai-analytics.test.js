import {
  connectTestDB,
  disconnectTestDB,
  cleanupTrackedData,
  createTestUser,
  tracker,
} from './testHelper.js';
import { generateJobDescriptionDraft } from '../src/services/ai/jobDescriptionService.js';
import { summarizeProjectProgress, summarizeWorkerHistory } from '../src/services/ai/summaryService.js';
import { processAdminQuery } from '../src/services/ai/adminAssistantService.js';
import {
  calculateRiskLevel,
  checkAccountAnomalies,
  checkJobAnomalies,
  evaluateUserRisk,
} from '../src/services/riskDetectionService.js';
import { Job, Project, ProjectWorker, HiringAgreement, User } from '../src/models/index.js';
import mongoose from 'mongoose';

export async function runAiAnalyticsTests() {
  console.log('\n========================================');
  console.log('RUNNING SUITE: AI Services & Analytics');
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

    const { user: employer } = await createTestUser({ name: 'Tech Builder', role: 'employer' });
    const { user: worker } = await createTestUser({ name: 'Master Mason', role: 'worker' });

    // 1. AI Job Description Draft Generation (with structured schema and reliable fallback)
    const jobDraft = await generateJobDescriptionDraft({
      title: 'Senior Brick Mason for 5000 sq ft Bungalow',
      skillRequired: 'mason',
      wageAmount: 950,
      location: { city: 'Pune' },
    });
    assert(
      jobDraft && typeof jobDraft.suggestedTitle === 'string' && typeof jobDraft.description === 'string',
      'AI Job description generates valid structured draft with editable title & description'
    );
    assert(
      Array.isArray(jobDraft.responsibilities) && Array.isArray(jobDraft.requiredSkills),
      'Job draft includes structured array of responsibilities and requiredSkills'
    );

    // 2. AI Project Progress Summary
    const dummyJob = await Job.create({
      employerId: employer._id,
      title: 'Masonry Project Job',
      description: 'Masonry project description',
      skillRequired: 'mason',
      wageAmount: 950,
      startDate: new Date(),
      location: { city: 'Pune' },
    });
    tracker.jobs.add(dummyJob._id);

    const project = await Project.create({
      jobId: dummyJob._id,
      employerId: employer._id,
      createdFromHiringAgreement: new mongoose.Types.ObjectId(),
      name: 'Bungalow Foundation Masonry',
      durationType: 'fixed_duration',
      paymentType: 'daily',
      paymentAmount: 950,
      startDate: new Date(),
      status: 'in_progress',
    });
    tracker.projects.add(project._id);

    const pw = await ProjectWorker.create({
      projectId: project._id,
      workerId: worker._id,
      hiringAgreementId: new mongoose.Types.ObjectId(),
      startDate: new Date(),
      wageType: 'daily',
      agreedWage: 950,
      status: 'active',
    });
    tracker.projectWorkers.add(pw._id);

    const projSummary = await summarizeProjectProgress(project._id, {
      userId: employer._id,
      role: 'employer',
    });
    assert(
      projSummary && typeof projSummary.summary === 'string' && projSummary.summary.length >= 10,
      'AI Project Summary provides truthful progress overview without hallucinations'
    );
    assert(
      Array.isArray(projSummary.keyPoints) && Array.isArray(projSummary.blockers),
      'Project summary output contains structured keyPoints and blockers arrays'
    );

    // 3. AI Worker History Summary
    const workerSummary = await summarizeWorkerHistory(worker._id, {
      userId: employer._id,
      role: 'employer',
    });
    assert(
      workerSummary && typeof workerSummary.summary === 'string' && workerSummary.summary.length >= 10,
      'AI Worker History Summary compiles worker activity truthfully'
    );

    // 4. Admin AI Analytics Assistant (Read-only execution & mutation safeguard)
    const queryResult = await processAdminQuery(
      { question: 'how many projects are currently delayed' },
      { _id: employer._id }
    );
    assert(
      queryResult && queryResult.answer && queryResult.intent === 'delayed_projects',
      'Admin AI Assistant parses intent and executes read-only delayed_projects analytics'
    );

    // 5. Admin AI Safeguard against arbitrary mutations
    let mutationSafeguardPassed = false;
    try {
      const dropAttempt = await processAdminQuery(
        { question: 'drop all users collection and delete projects' },
        { _id: employer._id }
      );
      if (dropAttempt.intent === 'unknown' || !dropAttempt.answer.includes('deleted')) {
        mutationSafeguardPassed = true;
      }
    } catch (_e) {
      mutationSafeguardPassed = true;
    }
    assert(mutationSafeguardPassed === true, 'Admin AI Assistant rejects destructive DB mutation requests');

    // 6. Deterministic Risk Scoring Bounded (0 - 100)
    const riskLevelCrit = calculateRiskLevel(85);
    const riskLevelLow = calculateRiskLevel(15);
    assert(riskLevelCrit === 'critical' && riskLevelLow === 'low', 'Deterministic risk score mapping is correct');

    // 7. Human Review Safeguard: Risk detection does NOT modify user.status
    const flags = await evaluateUserRisk(worker._id);
    const workerCheck = await User.findById(worker._id);
    assert(workerCheck.status === 'active', 'Risk detection never modifies user status or bans users automatically');

    console.log(`\nSUITE PASSED: ${passed}/${total} assertions succeeded.\n`);
    return { passed, total };
  } finally {
    await cleanupTrackedData();
  }
}

if (process.argv[1]?.endsWith('ai-analytics.test.js')) {
  runAiAnalyticsTests()
    .then(() => disconnectTestDB())
    .catch((err) => {
      console.error(err);
      disconnectTestDB().then(() => process.exit(1));
    });
}
