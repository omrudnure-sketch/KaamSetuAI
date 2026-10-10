import {
  connectTestDB,
  disconnectTestDB,
  cleanupTrackedData,
  createTestUser,
  tracker,
} from './testHelper.js';
import {
  createFromConfirmedAgreement,
  startProject,
  requestCompletion,
  completeProject,
  getProject,
} from '../src/services/projectService.js';
import { checkInWorker, checkOutWorker } from '../src/services/attendanceService.js';
import { createOrUpdateDailyProgress } from '../src/services/progressService.js';
import { createRequest as requestExtension, approveRequest as approveExtension } from '../src/services/extensionService.js';
import { recordPayment, getProjectPayments } from '../src/services/paymentService.js';
import { createReview } from '../src/services/reviewService.js';
import { Job, HiringAgreement, ProjectWorker } from '../src/models/index.js';
import { generateObjectId } from './testHelper.js';

export async function runOperationsTests() {
  console.log('\n========================================');
  console.log('RUNNING SUITE: Projects & Operations');
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

    const { user: worker } = await createTestUser({ name: 'Kisan Shinde', role: 'worker' });
    const { user: employer } = await createTestUser({ name: 'Vikram Joshi', role: 'employer' });

    // Setup base Job & confirmed HiringAgreement
    const job = await Job.create({
      employerId: employer._id,
      title: 'Commercial Painter 3 Days',
      description: 'Paint interior showroom walls and ceiling.',
      skillRequired: 'painter',
      wageAmount: 900,
      wageType: 'daily',
      durationType: 'fixed_duration',
      startDate: new Date(),
      location: { city: 'Pune', area: 'Shivajinagar' },
    });
    tracker.jobs.add(job._id);

    const agreement = await HiringAgreement.create({
      jobId: job._id,
      employerId: employer._id,
      workerId: worker._id,
      sourceType: 'invitation',
      sourceId: generateObjectId(),
      durationType: 'fixed_duration',
      startDate: new Date(),
      estimatedEndDate: new Date(Date.now() + 3 * 24 * 3600 * 1000),
      wageType: 'daily',
      proposedWage: 900,
      agreedWage: 900,
      status: 'confirmed',
      workerAccepted: true,
      employerAccepted: true,
    });
    tracker.agreements.add(agreement._id);

    // 1. Project creation from confirmed hiring agreement
    const projectResult = await createFromConfirmedAgreement(
      employer._id.toString(),
      agreement._id.toString(),
      {
        name: 'Showroom Interior Painting',
        description: 'Commercial interior painting contract',
      }
    );
    const project = projectResult.project;
    tracker.projects.add(project._id);
    projectResult.workers?.forEach((w) => tracker.projectWorkers.add(w._id));

    assert(project.status === 'confirmed', 'Project created in confirmed state');
    assert(project.paymentAmount === 900, 'Project paymentAmount matches agreed wage');

    // 2. State transition: start project -> in_progress
    const started = await startProject(employer._id.toString(), 'employer', project._id);
    assert(started.status === 'in_progress', 'Project transition to in_progress succeeds');

    // 3. Attendance check-in
    const attendanceDate = '2026-10-18';
    const checkInRecord = await checkInWorker(worker._id.toString(), {
      projectId: project._id,
      date: attendanceDate,
      notes: 'Arrived on site with safety gear',
    });
    tracker.attendances.add(checkInRecord._id);
    assert(checkInRecord.status === 'present' && Boolean(checkInRecord.checkIn), 'Worker checked in successfully');

    // 4. Duplicate attendance prevention (Must throw 409)
    let dupAttendanceRejected = false;
    try {
      await checkInWorker(worker._id.toString(), {
        projectId: project._id,
        date: attendanceDate,
      });
    } catch (err) {
      if (err.statusCode === 409) dupAttendanceRejected = true;
    }
    assert(dupAttendanceRejected === true, 'Duplicate check-in on same day is prevented with 409');

    // 5. Attendance check-out
    const checkOutRecord = await checkOutWorker(worker._id.toString(), {
      projectId: project._id,
      date: attendanceDate,
      notes: 'Completed base coat today',
    });
    assert(Boolean(checkOutRecord.checkOut), 'Worker check-out timestamp recorded');

    // 6. Daily progress update
    const progressRecord = await createOrUpdateDailyProgress(worker._id.toString(), project._id, {
      date: attendanceDate,
      percentage: 35,
      description: 'Finished primary primer layer on ground floor.',
      tasksCompleted: ['Primer ground floor', 'Masking electrical outlets'],
    });
    tracker.progressUpdates.add(progressRecord._id);
    assert(progressRecord.percentage === 35, 'Daily progress percentage submitted');

    // 7. Project Extension Request
    const currentExpectedEnd = project.currentExpectedEndDate || project.originalEstimatedEndDate || project.startDate;
    const requestedExtensionEnd = new Date(new Date(currentExpectedEnd).getTime() + 2 * 24 * 3600 * 1000);

    const extRequest = await requestExtension(
      { id: employer._id.toString(), role: 'employer' },
      project._id,
      {
        requestedEndDate: requestedExtensionEnd,
        reason: 'Client requested an extra accent wall texture coat.',
      }
    );
    tracker.extensions.add(extRequest._id);
    assert(extRequest.status === 'pending' && extRequest.workerApproval === 'pending', 'Extension request created and pending worker approval');

    // 8. Extension Approval by Worker
    const approvedExt = await approveExtension(
      { id: worker._id.toString(), role: 'worker' },
      extRequest._id
    );
    assert(approvedExt.status === 'approved', 'Extension mutually approved');

    // 9. Payment recording
    const pw = await ProjectWorker.findOne({ projectId: project._id, workerId: worker._id });
    const payment = await recordPayment(
      { id: employer._id.toString() },
      project._id,
      {
        projectWorkerId: pw._id,
        type: 'daily',
        amount: 900,
        method: 'bank_transfer',
        reference: 'TXN_TEST_12345',
      }
    );
    tracker.payments.add(payment._id);
    assert(payment.amount === 900, 'Payment recorded on ledger');

    const payments = await getProjectPayments({ id: employer._id.toString() }, project._id);
    assert(Array.isArray(payments) && payments.length === 1 && payments[0].amount === 900, 'Payment ledger retrieved project payments correctly');

    // 10. Reviews blocked while project is in_progress (400)
    let earlyReviewRejected = false;
    try {
      await createReview({ id: employer._id.toString(), role: 'employer' }, project._id, {
        revieweeId: worker._id.toString(),
        rating: 5,
        comment: 'Great work so far!',
      });
    } catch (err) {
      if (err.statusCode === 400) earlyReviewRejected = true;
    }
    assert(earlyReviewRejected === true, 'Review creation blocked before project completion');

    // 11. Project completion workflow: in_progress -> completion_requested -> completed
    const completionReq = await requestCompletion(worker._id.toString(), 'worker', project._id);
    assert(completionReq.status === 'completion_requested', 'Completion requested by worker');

    const completed = await completeProject(employer._id.toString(), 'employer', project._id);
    assert(completed.status === 'completed', 'Project completed by employer');

    // 12. Review submission after completion
    const review = await createReview(
      { id: employer._id.toString(), role: 'employer' },
      project._id,
      {
        revieweeId: worker._id.toString(),
        rating: 5,
        comment: 'Exceptional finish and very disciplined punctuality.',
      }
    );
    tracker.reviews.add(review._id);
    assert(review.rating === 5 && review.status === 'published', 'Review created and published successfully');

    console.log(`\nSUITE PASSED: ${passed}/${total} assertions succeeded.\n`);
    return { passed, total };
  } finally {
    await cleanupTrackedData();
  }
}

if (process.argv[1]?.endsWith('operations.test.js')) {
  runOperationsTests()
    .then(() => disconnectTestDB())
    .catch((err) => {
      console.error(err);
      disconnectTestDB().then(() => process.exit(1));
    });
}
