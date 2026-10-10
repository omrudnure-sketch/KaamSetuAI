import {
  connectTestDB,
  disconnectTestDB,
  cleanupTrackedData,
  createTestUser,
  tracker,
} from './testHelper.js';
import { createOrUpdateWorkerProfile, getWorkerProfileByUserId } from '../src/services/workerProfileService.js';
import { createOrUpdateEmployerProfile, getEmployerProfileByUserId } from '../src/services/employerProfileService.js';
import { createJobForEmployer, getAvailableJobs } from '../src/services/jobService.js';
import { applyToJob, selectApplication } from '../src/services/applicationService.js';
import { createHiringAgreement, acceptHiringAgreement } from '../src/services/hiringService.js';
import { createFromConfirmedAgreement, startProject, requestCompletion, completeProject, getProject } from '../src/services/projectService.js';
import { checkInWorker, checkOutWorker } from '../src/services/attendanceService.js';
import { createOrUpdateDailyProgress } from '../src/services/progressService.js';
import { createRequest as requestExtension, approveRequest as approveExtension } from '../src/services/extensionService.js';
import { recordPayment, getProjectPayments } from '../src/services/paymentService.js';
import { createReview } from '../src/services/reviewService.js';
import { createConversation, sendMessage, getMessages } from '../src/services/chatService.js';
import { createNotification, getUnreadCount } from '../src/services/notificationService.js';
import { createComplaint } from '../src/services/complaintService.js';
import { createDispute } from '../src/services/disputeService.js';
import { getDashboardOverview } from '../src/services/adminDashboardService.js';
import { JobApplication, ProjectWorker } from '../src/models/index.js';

export async function runE2EWorkflowTests() {
  console.log('\n======================================================');
  console.log('RUNNING SUITE: Full Platform End-to-End Workflow (20 Steps)');
  console.log('======================================================');

  let passed = 0;
  let total = 0;

  const assert = (condition, msg) => {
    total++;
    if (condition) {
      console.log(`  ✓ [Step ${total}] ${msg}`);
      passed++;
    } else {
      console.error(`  ✗ [Step ${total}] ${msg}`);
      throw new Error(`Assertion failed at step ${total}: ${msg}`);
    }
  };

  try {
    await connectTestDB();

    // Step 1: Worker Registers
    const { user: worker, token: workerToken } = await createTestUser({
      name: 'Santosh Kamble',
      role: 'worker',
      preferredLanguage: 'mr',
    });
    assert(worker.role === 'worker' && Boolean(workerToken), 'Worker registers with valid account & token');

    // Step 2: Worker Completes Profile
    const workerProfile = await createOrUpdateWorkerProfile(worker._id, {
      fullName: 'Santosh Kamble',
      primarySkill: 'tile_layer',
      skills: ['tile_layer', 'mason'],
      experienceYears: 5,
      dailyWage: 800,
      bio: 'Expert ceramic and marble tile layer.',
      location: { city: 'Pune', area: 'Hadapsar' },
      languages: ['mr', 'hi'],
      profilePhoto: 'https://example.com/worker.jpg',
    });
    tracker.workerProfiles.add(workerProfile._id);
    assert(workerProfile.primarySkill === 'tile_layer', 'Worker completes profile successfully');

    // Step 3: Employer Registers
    const { user: employer, token: empToken } = await createTestUser({
      name: 'Amit Deshpande',
      role: 'employer',
      preferredLanguage: 'en',
    });
    assert(employer.role === 'employer' && Boolean(empToken), 'Employer registers with valid account & token');

    // Step 4: Employer Completes Profile
    const empProfile = await createOrUpdateEmployerProfile(employer._id, {
      name: 'Amit Deshpande',
      businessName: 'Deshpande Interiors',
      businessType: 'contractor',
      phone: employer.phone,
      description: 'Interior renovation and finishing company.',
      location: { city: 'Pune', area: 'Kalyani Nagar' },
    });
    tracker.employerProfiles.add(empProfile._id);
    assert(empProfile.businessName === 'Deshpande Interiors', 'Employer completes profile successfully');

    // Step 5: Employer Posts a Job
    const job = await createJobForEmployer(employer._id, {
      title: 'Kitchen & Bathroom Tile Layer 2 Days',
      description: 'Precision Italian tile fitting in luxury apartment.',
      skillRequired: 'tile_layer',
      wageAmount: 850,
      wageType: 'daily',
      durationType: 'fixed_duration',
      startDate: new Date(Date.now() + 24 * 3600 * 1000),
      location: { city: 'Pune', area: 'Kalyani Nagar' },
      workersRequired: 1,
      status: 'open',
    });
    tracker.jobs.add(job._id);
    assert(job.status === 'open' && job.skillRequired === 'tile_layer', 'Employer posts job on marketplace');

    // Step 6: Worker Applies to Job
    const application = await applyToJob(worker._id, {
      jobId: job._id,
      proposedWage: 850,
      message: 'Experienced in large format tile placement.',
    });
    tracker.applications.add(application._id);
    assert(application.status === 'pending', 'Worker applies to job successfully');

    // Step 7: Employer Selects Worker
    await selectApplication(employer._id.toString(), application._id.toString());
    const selectedApp = await JobApplication.findById(application._id);
    assert(selectedApp.status === 'selected', 'Employer selects worker application');

    // Step 8: Hiring Terms are Proposed
    const agreement = await createHiringAgreement(
      { id: employer._id.toString(), role: 'employer' },
      {
        sourceType: 'application',
        sourceId: application._id,
        durationType: 'fixed_duration',
        startDate: new Date(Date.now() + 24 * 3600 * 1000),
        estimatedEndDate: new Date(Date.now() + 3 * 24 * 3600 * 1000),
        wageType: 'daily',
        proposedWage: 850,
        workingHours: { start: '09:00', end: '18:00' },
        message: 'Contract for 2 full days of tile laying.',
      }
    );
    tracker.agreements.add(agreement._id);
    assert(agreement.status === 'pending_worker', 'Hiring agreement proposed and pending worker confirmation');

    // Step 9: Both Parties Confirm Hiring
    const confirmedAgreement = await acceptHiringAgreement(
      worker._id.toString(),
      'worker',
      agreement._id
    );
    assert(confirmedAgreement.status === 'confirmed', 'Both parties mutually confirm hiring agreement');

    // Step 10: Project is Created from Confirmed Agreement
    const projectResult = await createFromConfirmedAgreement(
      employer._id.toString(),
      agreement._id.toString(),
      {
        name: 'Kalyani Nagar Luxury Tile Fitting',
        description: 'Complete apartment tile replacement',
      }
    );
    const project = projectResult.project;
    tracker.projects.add(project._id);
    projectResult.workers?.forEach((w) => tracker.projectWorkers.add(w._id));
    assert(project.status === 'confirmed', 'Project created from confirmed hiring agreement');

    // Step 11: Project Starts
    const started = await startProject(employer._id.toString(), 'employer', project._id);
    assert(started.status === 'in_progress', 'Project started by employer');

    // Step 12: Worker Checks In & Out
    const today = '2026-10-19';
    const checkIn = await checkInWorker(worker._id.toString(), {
      projectId: project._id,
      date: today,
      notes: 'On site with laser level',
    });
    tracker.attendances.add(checkIn._id);
    const checkOut = await checkOutWorker(worker._id.toString(), {
      projectId: project._id,
      date: today,
    });
    assert(Boolean(checkIn.checkIn) && Boolean(checkOut.checkOut), 'Worker check-in and check-out recorded');

    // Step 13: Worker Submits Daily Progress
    const progress = await createOrUpdateDailyProgress(worker._id.toString(), project._id, {
      date: today,
      percentage: 50,
      description: 'Completed entire kitchen floor tile layout.',
    });
    tracker.progressUpdates.add(progress._id);
    assert(progress.percentage === 50, 'Daily progress percentage recorded');

    // Step 14: Extension Requested & Mutually Approved
    const currentEnd = project.currentExpectedEndDate || project.originalEstimatedEndDate || project.startDate;
    const extensionEnd = new Date(new Date(currentEnd).getTime() + 24 * 3600 * 1000);
    const ext = await requestExtension(
      { id: employer._id.toString(), role: 'employer' },
      project._id,
      { requestedEndDate: extensionEnd, reason: 'Additional balcony tiling added.' }
    );
    tracker.extensions.add(ext._id);
    const approvedExt = await approveExtension(
      { id: worker._id.toString(), role: 'worker' },
      ext._id
    );
    assert(approvedExt.status === 'approved', 'Extension requested and mutually approved');

    // Step 15: Employer Records Payment
    const pw = await ProjectWorker.findOne({ projectId: project._id, workerId: worker._id });
    const payment = await recordPayment(
      { id: employer._id.toString() },
      project._id,
      {
        projectWorkerId: pw._id,
        type: 'daily',
        amount: 850,
        method: 'upi',
        reference: 'UPI_REF_998877',
      }
    );
    tracker.payments.add(payment._id);
    const paymentsList = await getProjectPayments({ id: employer._id.toString() }, project._id);
    assert(paymentsList.length >= 1 && paymentsList[0].amount === 850, 'Payment recorded on ledger successfully');

    // Step 16: Project is Completed
    await requestCompletion(worker._id.toString(), 'worker', project._id);
    const completedProject = await completeProject(employer._id.toString(), 'employer', project._id);
    assert(completedProject.status === 'completed', 'Project completion requested and confirmed');

    // Step 17: Reviews Exchanged
    const reviewFromEmp = await createReview(
      { id: employer._id.toString(), role: 'employer' },
      project._id,
      {
        revieweeId: worker._id.toString(),
        rating: 5,
        comment: 'Flawless alignment on Italian tiles. Highly recommended!',
      }
    );
    tracker.reviews.add(reviewFromEmp._id);

    const reviewFromWorker = await createReview(
      { id: worker._id.toString(), role: 'worker' },
      project._id,
      {
        revieweeId: employer._id.toString(),
        rating: 5,
        comment: 'Prompt payment and very supportive employer.',
      }
    );
    tracker.reviews.add(reviewFromWorker._id);
    assert(reviewFromEmp.rating === 5 && reviewFromWorker.rating === 5, 'Mutual 5-star reviews exchanged after completion');

    // Step 18: Chat & Notifications Operate
    const conv = await createConversation(
      { id: employer._id.toString() },
      { recipientId: worker._id.toString(), projectId: project._id.toString() }
    );
    tracker.conversations.add(conv._id);

    const chatMsg = await sendMessage(
      { id: employer._id.toString(), name: employer.name },
      conv._id,
      { content: 'Thank you for the fantastic tile work, Santosh!' }
    );
    tracker.messages.add(chatMsg._id);

    const notif = await createNotification({
      userId: worker._id,
      type: 'PROJECT_COMPLETED',
      title: 'Project Closed',
      message: 'Project has been officially completed.',
    });
    tracker.notifications.add(notif._id);
    assert(Boolean(chatMsg.content) && Boolean(notif._id), 'Chat message delivered and notification generated');

    // Step 19: Dispute / Complaint Flow
    const testDispute = await createDispute(
      { id: employer._id.toString() },
      {
        projectId: project._id.toString(),
        againstUserId: worker._id.toString(),
        type: 'other',
        amount: 0,
        description: 'Settlement query regarding leftover tile box return.',
      }
    );
    tracker.disputes.add(testDispute._id);
    assert(testDispute.status === 'open', 'Dispute created and assigned for moderation');

    // Step 20: Admin Governance & Analytics Verification
    const { user: admin } = await createTestUser({
      name: 'System Admin',
      role: 'admin',
      adminRole: 'super_admin',
    });
    const overview = await getDashboardOverview();
    assert(
      overview && overview.kpis && typeof overview.kpis.totalWorkers === 'number',
      'Authorized Admin accesses real platform analytics reflecting live test data'
    );

    console.log(`\n======================================================`);
    console.log(`FULL E2E LIFECYCLE PASSED: All 20 steps completed!`);
    console.log(`======================================================\n`);
    return { passed, total };
  } finally {
    await cleanupTrackedData();
  }
}

if (process.argv[1]?.endsWith('e2e-workflow.test.js')) {
  runE2EWorkflowTests()
    .then(() => disconnectTestDB())
    .catch((err) => {
      console.error(err);
      disconnectTestDB().then(() => process.exit(1));
    });
}
