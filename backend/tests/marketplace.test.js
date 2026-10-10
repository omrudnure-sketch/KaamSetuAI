import {
  connectTestDB,
  disconnectTestDB,
  cleanupTrackedData,
  createTestUser,
  tracker,
} from './testHelper.js';
import {
  createOrUpdateWorkerProfile,
  getWorkerProfileByUserId,
  calculateProfileCompletion as calcWorkerCompletion,
} from '../src/services/workerProfileService.js';
import {
  createOrUpdateEmployerProfile,
  getEmployerProfileByUserId,
} from '../src/services/employerProfileService.js';
import {
  createJobForEmployer,
  getAvailableJobs,
  closeEmployerJob,
  getEmployerJobById,
} from '../src/services/jobService.js';
import { applyToJob } from '../src/services/applicationService.js';
import {
  createHiringAgreement,
  acceptHiringAgreement,
} from '../src/services/hiringService.js';
import { Job, JobApplication, HiringAgreement } from '../src/models/index.js';

export async function runMarketplaceTests() {
  console.log('\n========================================');
  console.log('RUNNING SUITE: Profiles, Jobs & Marketplace');
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

    const { user: worker } = await createTestUser({ name: 'Ramesh Mali', role: 'worker' });
    const { user: employer } = await createTestUser({ name: 'Shrikant Patil', role: 'employer' });

    // 1. Worker profile creation & completion
    const workerProfile = await createOrUpdateWorkerProfile(worker._id, {
      fullName: 'Ramesh Mali',
      primarySkill: 'gardener',
      skills: ['gardener', 'landscaper'],
      experienceYears: 4,
      dailyWage: 650,
      bio: 'Experienced gardener in Pune',
      location: { city: 'Pune', area: 'Kothrud' },
      languages: ['mr', 'hi'],
      profilePhoto: 'https://example.com/photo.jpg',
    });
    tracker.workerProfiles.add(workerProfile._id);
    assert(workerProfile.primarySkill === 'gardener', 'Worker profile created with primarySkill');

    const completion = calcWorkerCompletion(workerProfile);
    assert(completion >= 90, `Worker profile completion calculated accurately (${completion}%)`);

    // 2. Worker profile retrieval
    const fetchedWorker = await getWorkerProfileByUserId(worker._id);
    assert(fetchedWorker.fullName === 'Ramesh Mali', 'Worker profile retrieved by userId');

    // 3. Employer profile creation & retrieval
    const empProfile = await createOrUpdateEmployerProfile(employer._id, {
      name: 'Shrikant Patil',
      businessName: 'Patil Constructions',
      businessType: 'contractor',
      phone: employer.phone,
      description: 'Residential builder in Pune',
      location: { city: 'Pune', area: 'Baner' },
      profilePhoto: 'https://example.com/emp.jpg',
    });
    tracker.employerProfiles.add(empProfile._id);
    assert(empProfile.businessName === 'Patil Constructions', 'Employer profile created successfully');

    const fetchedEmp = await getEmployerProfileByUserId(employer._id);
    assert(fetchedEmp.businessType === 'contractor', 'Employer profile retrieved successfully');

    // 4. Job Creation
    const job = await createJobForEmployer(employer._id, {
      title: 'Expert Gardener for Garden Renovation',
      description: 'Need skilled gardener for full lawn redesign and trimming.',
      skillRequired: 'gardener',
      wageAmount: 700,
      wageType: 'daily',
      durationType: 'single_day',
      startDate: new Date(Date.now() + 24 * 3600 * 1000),
      location: { city: 'Pune', area: 'Kothrud' },
      workersRequired: 1,
      status: 'open',
    });
    tracker.jobs.add(job._id);
    assert(job.status === 'open' && job.skillRequired === 'gardener', 'Employer created job successfully');

    // 5. Job Search & Filtering
    const searchRes = await getAvailableJobs({ skill: 'gardener', city: 'Pune' });
    const foundJob = searchRes.jobs.some((j) => j._id.toString() === job._id.toString());
    assert(foundJob === true, 'Job discoverable via skill and city filters');

    // 6. Application submission
    const application = await applyToJob(worker._id, {
      jobId: job._id,
      proposedWage: 700,
      message: 'I have 4 years experience in lawn trimming.',
    });
    tracker.applications.add(application._id);
    assert(application.status === 'pending', 'Worker submitted application successfully');

    // 7. Duplicate Application Prevention (Must reject with 409)
    let dupAppRejected = false;
    try {
      await applyToJob(worker._id, {
        jobId: job._id,
        proposedWage: 700,
      });
    } catch (err) {
      if (err.statusCode === 409) dupAppRejected = true;
    }
    assert(dupAppRejected === true, 'Duplicate job application prevented with 409 Conflict');

    // 8. Closed Job not presented as available
    await closeEmployerJob(employer._id, job._id);
    const searchAfterClose = await getAvailableJobs({ skill: 'gardener', city: 'Pune' });
    const closedFound = searchAfterClose.jobs.some((j) => j._id.toString() === job._id.toString());
    assert(closedFound === false, 'Closed jobs are filtered out from public job search');

    // Reopen job for hiring agreement test
    await Job.findByIdAndUpdate(job._id, { status: 'open' });
    await JobApplication.findByIdAndUpdate(application._id, { status: 'selected' });

    // 9. Hiring Agreement Creation from selected application
    const agreement = await createHiringAgreement(
      { id: employer._id.toString(), role: 'employer' },
      {
        sourceType: 'application',
        sourceId: application._id,
        durationType: 'single_day',
        startDate: new Date(Date.now() + 24 * 3600 * 1000),
        wageType: 'daily',
        proposedWage: 750,
        workingHours: { start: '09:00', end: '18:00' },
        message: 'Offering 750 per day for complete garden work.',
      }
    );
    tracker.agreements.add(agreement._id);
    assert(agreement.status === 'pending_worker', 'Agreement created in pending_worker state');

    // 10. Worker responds with confirmation
    const confirmedAgreement = await acceptHiringAgreement(
      worker._id.toString(),
      'worker',
      agreement._id
    );
    assert(confirmedAgreement.status === 'confirmed', 'Agreement mutually confirmed by worker');
    assert(confirmedAgreement.agreedWage === 750, 'Agreed wage recorded correctly on confirmation');

    // 11. Immutability: Confirmed agreement cannot be re-responded or silently altered
    let reConfirmRejected = false;
    try {
      await acceptHiringAgreement(
        worker._id.toString(),
        'worker',
        agreement._id
      );
    } catch (err) {
      if (err.statusCode === 400) reConfirmRejected = true;
    }
    assert(reConfirmRejected === true, 'Cannot re-confirm or mutate an already confirmed agreement');

    console.log(`\nSUITE PASSED: ${passed}/${total} assertions succeeded.\n`);
    return { passed, total };
  } finally {
    await cleanupTrackedData();
  }
}

if (process.argv[1]?.endsWith('marketplace.test.js')) {
  runMarketplaceTests()
    .then(() => disconnectTestDB())
    .catch((err) => {
      console.error(err);
      disconnectTestDB().then(() => process.exit(1));
    });
}
