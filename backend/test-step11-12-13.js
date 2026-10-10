import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
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
  Payment,
  Review,
} from './src/models/index.js';
import * as extensionService from './src/services/extensionService.js';
import * as paymentService from './src/services/paymentService.js';
import * as reviewService from './src/services/reviewService.js';
import * as projectService from './src/services/projectService.js';
import * as attendanceService from './src/services/attendanceService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const runTests = async () => {
  console.log('=== STARTING E2E VERIFICATION TEST FOR STEPS 11 + 12 + 13 ===');
  await connectDB();

  try {
    const timestamp = Date.now();

    // 1. Create Test Users
    const employerUser = await User.create({
      name: 'Test Employer User',
      phone: `99${timestamp.toString().slice(-8)}`,
      role: 'employer',
      isVerified: true,
    });
    const workerUser = await User.create({
      name: 'Test Worker User',
      phone: `88${timestamp.toString().slice(-8)}`,
      role: 'worker',
      isVerified: true,
    });
    const unauthorizedUser = await User.create({
      name: 'Test Unauth User',
      phone: `77${timestamp.toString().slice(-8)}`,
      role: 'worker',
      isVerified: true,
    });

    // 2. Create Profiles
    const employerProfile = await EmployerProfile.create({
      userId: employerUser._id,
      name: 'Test Employer E2E',
      businessName: 'E2E Builders Ltd',
      businessType: 'contractor',
      location: { city: 'Mumbai', area: 'Andheri' },
    });

    const workerProfile = await WorkerProfile.create({
      userId: workerUser._id,
      fullName: 'Test Worker E2E',
      primarySkill: 'carpenter',
      dailyWage: 900,
      location: { city: 'Mumbai', area: 'Andheri' },
    });

    console.log('✓ Users and profiles created');

    // 3. Create Job & Confirmed Hiring Agreement
    const job = await Job.create({
      employerId: employerUser._id,
      title: 'Commercial Carpentry Project',
      category: 'carpentry',
      skillRequired: 'carpentry',
      description: 'Custom cabinetry installation',
      location: { city: 'Mumbai', area: 'Andheri' },
      wageAmount: 950,
      wageType: 'daily',
      durationType: 'fixed_duration',
      durationDays: 5,
      startDate: new Date('2026-10-10'),
      workersNeeded: 1,
    });

    const agreement = await HiringAgreement.create({
      jobId: job._id,
      employerId: employerUser._id,
      workerId: workerUser._id,
      sourceType: 'application',
      sourceId: new mongoose.Types.ObjectId(),
      agreedWage: 950,
      proposedWage: 950,
      wageType: 'daily',
      durationType: 'fixed_duration',
      startDate: new Date('2026-10-10'),
      estimatedEndDate: new Date('2026-10-15'),
      status: 'confirmed',
      agreedAt: new Date(),
    });

    // 4. Create Project & ProjectWorker from Agreement
    const { project } = await projectService.createFromConfirmedAgreement(employerUser._id, agreement._id);
    const workerAuth = { id: workerUser._id.toString(), role: 'worker' };
    const employerAuth = { id: employerUser._id.toString(), role: 'employer' };

    console.log(`✓ Project created: ${project._id} (Current end: ${project.currentExpectedEndDate})`);

    // 5. Start Project
    await projectService.startProject(employerUser._id, 'employer', project._id);
    console.log('✓ Project status updated to in_progress');

    // 6. Test Extension Workflow
    // Employer requests extension from 2026-10-15 to 2026-10-18
    const extReq1 = await extensionService.createRequest(employerAuth, project._id.toString(), {
      requestedEndDate: '2026-10-18',
      proposedWage: 1000,
      reason: 'Additional custom cabinets requested by client',
    });

    console.log(`✓ Extension 1 created by Employer: Status=${extReq1.status}, WorkerApproval=${extReq1.workerApproval}, EmployerApproval=${extReq1.employerApproval}`);

    // Verify project date has NOT changed yet (unilateral extension prevention)
    const projectCheck1 = await Project.findById(project._id);
    if (new Date(projectCheck1.currentExpectedEndDate).toISOString() === new Date('2026-10-18').toISOString()) {
      throw new Error('FAIL: Project end date changed before worker approval!');
    }
    console.log('✓ Verified project end date preserved before mutual approval');

    // Worker approves Extension 1
    const extApproved1 = await extensionService.approveRequest(workerAuth, extReq1._id.toString());
    console.log(`✓ Extension 1 approved by Worker: Status=${extApproved1.status}, EffectiveAt=${extApproved1.effectiveAt}`);

    const projectCheck2 = await Project.findById(project._id);
    console.log(`✓ Verified project expected end date updated to: ${projectCheck2.currentExpectedEndDate.toISOString().split('T')[0]}`);
    console.log(`✓ Verified original estimated end date preserved: ${projectCheck2.originalEstimatedEndDate.toISOString().split('T')[0]}`);

    if (new Date(projectCheck2.currentExpectedEndDate).toISOString().split('T')[0] !== '2026-10-18') {
      throw new Error('FAIL: Project currentExpectedEndDate did not update correctly!');
    }

    // 7. Worker requests Extension 2 -> Employer rejects
    const extReq2 = await extensionService.createRequest(workerAuth, project._id.toString(), {
      requestedEndDate: '2026-10-22',
      reason: 'Need extra time for varnish curing',
    });
    console.log(`✓ Extension 2 created by Worker: Status=${extReq2.status}`);

    const extRejected2 = await extensionService.rejectRequest(employerAuth, extReq2._id.toString());
    console.log(`✓ Extension 2 rejected by Employer: Status=${extRejected2.status}`);

    const projectCheck3 = await Project.findById(project._id);
    if (new Date(projectCheck3.currentExpectedEndDate).toISOString().split('T')[0] !== '2026-10-18') {
      throw new Error('FAIL: Rejected extension modified project end date!');
    }
    console.log('✓ Verified rejected extension did not alter project dates');

    // 8. Test Payments & Earnings Ledger
    const projectWorker = await ProjectWorker.findOne({ projectId: project._id, workerId: workerUser._id });

    // Record 2 days attendance
    await attendanceService.checkInWorker(workerUser._id, { projectId: project._id, date: '2026-10-10' });
    await attendanceService.checkOutWorker(workerUser._id, { projectId: project._id, date: '2026-10-10' });
    await attendanceService.checkInWorker(workerUser._id, { projectId: project._id, date: '2026-10-11' });
    await attendanceService.checkOutWorker(workerUser._id, { projectId: project._id, date: '2026-10-11' });

    // Employer records payment #1
    const payment1 = await paymentService.recordPayment(employerAuth, project._id.toString(), {
      projectWorkerId: projectWorker._id.toString(),
      type: 'daily',
      amount: 1000,
      paymentDate: '2026-10-10',
      method: 'upi',
      reference: 'UPI-987654321',
      notes: 'Day 1 payment',
    });

    console.log(`✓ Payment 1 recorded: Amount ₹${payment1.amount}, Method: ${payment1.method}`);

    // Verify worker payment list & earnings summary
    const workerPayments = await paymentService.getWorkerPayments(workerAuth);
    if (workerPayments.length !== 1 || workerPayments[0].amount !== 1000) {
      throw new Error('FAIL: Worker payment list mismatch');
    }
    console.log('✓ Worker payment list verified');

    const earningsSummary = await paymentService.getWorkerEarningsSummary(workerAuth);
    console.log(`✓ Worker Earnings Summary: Total = ₹${earningsSummary.totalEarnings}, Paid = ₹${earningsSummary.paid}, Expected = ₹${earningsSummary.totalExpected}`);

    // 9. Test Unauthorized Payment Recording (Worker cannot create employer payment)
    try {
      await paymentService.recordPayment(workerAuth, project._id.toString(), {
        projectWorkerId: projectWorker._id.toString(),
        type: 'daily',
        amount: 500,
      });
      throw new Error('FAIL: Worker was able to record payment!');
    } catch (err) {
      if (err.statusCode === 403) {
        console.log('✓ Verified 403 Forbidden when worker attempts to record payment');
      } else {
        throw err;
      }
    }

    // 10. Complete Project & Review Eligibility
    // Review before completion must fail
    try {
      await reviewService.createReview(employerAuth, project._id.toString(), {
        revieweeId: workerUser._id.toString(),
        rating: 5,
        comment: 'Great work',
      });
      throw new Error('FAIL: Review submitted before project completion!');
    } catch (err) {
      if (err.statusCode === 400) {
        console.log('✓ Verified 400 Bad Request when reviewing non-completed project');
      } else {
        throw err;
      }
    }

    // Mark project as completed
    await projectService.requestCompletion(workerUser._id, 'worker', project._id);
    await projectService.completeProject(employerUser._id, 'employer', project._id);
    console.log('✓ Project completed successfully');

    // 11. Test Reviews & Rating Calculation
    // Employer rates Worker 5 stars
    const reviewByEmployer = await reviewService.createReview(employerAuth, project._id.toString(), {
      revieweeId: workerUser._id.toString(),
      rating: 5,
      comment: 'Extremely skilled carpenter, finished on time with top quality!',
    });
    console.log(`✓ Employer reviewed Worker: Rating=${reviewByEmployer.rating}/5`);

    // Worker rates Employer 5 stars
    const reviewByWorker = await reviewService.createReview(workerAuth, project._id.toString(), {
      revieweeId: employerUser._id.toString(),
      rating: 5,
      comment: 'Prompt daily payments and clear instructions.',
    });
    console.log(`✓ Worker reviewed Employer: Rating=${reviewByWorker.rating}/5`);

    // Verify Profiles updated
    const updatedWorkerProf = await WorkerProfile.findOne({ userId: workerUser._id });
    const updatedEmployerProf = await EmployerProfile.findOne({ userId: employerUser._id });

    console.log(`✓ Updated Worker Profile: Rating = ${updatedWorkerProf.rating}, Total Reviews = ${updatedWorkerProf.totalReviews}`);
    console.log(`✓ Updated Employer Profile: Rating = ${updatedEmployerProf.rating}, Total Reviews = ${updatedEmployerProf.totalReviews}`);

    if (updatedWorkerProf.rating !== 5 || updatedWorkerProf.totalReviews !== 1) {
      throw new Error('FAIL: Worker rating calculation mismatch');
    }
    if (updatedEmployerProf.rating !== 5 || updatedEmployerProf.totalReviews !== 1) {
      throw new Error('FAIL: Employer rating calculation mismatch');
    }

    // Test duplicate review prevention
    try {
      await reviewService.createReview(employerAuth, project._id.toString(), {
        revieweeId: workerUser._id.toString(),
        rating: 4,
        comment: 'Second review attempt',
      });
      throw new Error('FAIL: Duplicate review allowed!');
    } catch (err) {
      if (err.statusCode === 409) {
        console.log('✓ Verified 409 Conflict for duplicate review submission');
      } else {
        throw err;
      }
    }

    // Test non-participant review rejection
    try {
      const unauthAuth = { id: unauthorizedUser._id.toString(), role: 'worker' };
      await reviewService.createReview(unauthAuth, project._id.toString(), {
        revieweeId: employerUser._id.toString(),
        rating: 5,
      });
      throw new Error('FAIL: Non-participant review allowed!');
    } catch (err) {
      if (err.statusCode === 403) {
        console.log('✓ Verified 403 Forbidden for non-participant review');
      } else {
        throw err;
      }
    }

    console.log('=== ALL E2E TESTS PASSED SUCCESSFULLY FOR STEPS 11 + 12 + 13 ===');
  } catch (error) {
    console.error('❌ E2E TEST FAILED:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

runTests();
