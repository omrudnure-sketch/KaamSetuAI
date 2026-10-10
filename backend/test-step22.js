import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDB } from './src/config/db.js';
import { User, WorkerProfile, Job } from './src/models/index.js';
import {
  DEFAULT_WEIGHTS,
  calculateDistanceKm,
  checkSkillAffinity,
  getMatchingFactors,
  explainMatch,
  calculateMatchScore,
  recommendWorkersForJob,
  recommendJobsForWorker,
} from './src/services/ai/matchingService.js';

async function runStep22Tests() {
  console.log('==================================================');
  console.log('--- STARTING STEP 22 VERIFICATION TESTS (AI MATCHING) ---');
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

  // Temporary test data records to clean up after testing
  const createdUserIds = [];
  const createdJobIds = [];

  try {
    // ----------------------------------------------------
    // Test 1 & 2: Skill Match Affinity & Score Ranking
    // ----------------------------------------------------
    console.log('\n--- 1. Testing Skill Affinity & Scoring ---');
    const exactMatch = checkSkillAffinity('electrician', 'electrician', ['wiring']);
    assert(exactMatch.score === 100 && exactMatch.matchType === 'exact_primary', 'Exact primary skill yields 100%');

    const additionalMatch = checkSkillAffinity('plumber', 'electrician', ['plumbing', 'wiring']);
    assert(additionalMatch.score >= 85, 'Skill match in additional skills yields high affinity score');

    const relatedTradeMatch = checkSkillAffinity('carpenter', 'furniture maker', ['woodwork']);
    assert(relatedTradeMatch.score >= 70, 'Related trade skill via taxonomy yields >= 70%');

    const mismatch = checkSkillAffinity('electrician', 'painter', []);
    assert(mismatch.score <= 30, 'Skill mismatch produces low skill affinity score');

    // ----------------------------------------------------
    // Test 3: Availability & Wage Compatibility
    // ----------------------------------------------------
    console.log('\n--- 2. Testing Availability & Wage Compatibility Factors ---');
    const sampleJob = {
      skillRequired: 'electrician',
      location: { city: 'Pune', area: 'Kothrud' },
      wageAmount: 1000,
      startDate: new Date(),
    };

    const workerAvailable = {
      primarySkill: 'electrician',
      location: { city: 'Pune', area: 'Kothrud' },
      dailyWage: 950,
      availability: 'available',
      experienceYears: 4,
      rating: 4.8,
      totalReviews: 12,
      completedProjects: 5,
    };

    const workerUnavailable = {
      ...workerAvailable,
      dailyWage: 1800, // Excessive wage
      availability: 'unavailable',
    };

    const factorsAvailable = getMatchingFactors(sampleJob, workerAvailable);
    const factorsUnavailable = getMatchingFactors(sampleJob, workerUnavailable);

    assert(factorsAvailable.score > factorsUnavailable.score, 'Available worker with compatible wage scores higher than unavailable high-wage worker');
    assert(factorsAvailable.factors.availability.score === 100, 'Available status gets 100 availability factor');
    assert(factorsUnavailable.factors.availability.score === 10, 'Unavailable status gets 10 availability factor');
    assert(factorsAvailable.factors.wage.score === 100, 'Wage within budget gets 100 wage factor');
    assert(factorsUnavailable.factors.wage.score < 50, 'Wage exceeding budget by >30% gets lower wage factor');

    // ----------------------------------------------------
    // Test 4: Missing Coordinates Handling (No Fabricated Distances)
    // ----------------------------------------------------
    console.log('\n--- 3. Testing Missing Coordinates Handling ---');
    const distanceWithCoords = calculateDistanceKm([73.8567, 18.5204], [73.8600, 18.5300]);
    assert(typeof distanceWithCoords === 'number' && distanceWithCoords > 0, 'Valid coordinates produce genuine km distance');

    const distanceMissingCoords = calculateDistanceKm([0, 0], [73.8600, 18.5300]);
    assert(distanceMissingCoords === null, 'Default [0,0] coordinates do NOT fabricate a distance (returns null)');

    const distanceNullCoords = calculateDistanceKm(null, [73.8600, 18.5300]);
    assert(distanceNullCoords === null, 'Missing coordinates return null distance');

    const workerNoCoords = {
      primarySkill: 'electrician',
      location: { city: 'Pune', area: 'Baner', coordinates: { coordinates: [0, 0] } },
      experienceYears: 3,
    };
    const jobNoCoords = {
      skillRequired: 'electrician',
      location: { city: 'Pune', area: 'Baner', coordinates: { coordinates: [0, 0] } },
      wageAmount: 1000,
    };
    const matchAnalysis = calculateMatchScore(jobNoCoords, workerNoCoords);
    assert(matchAnalysis.factors.location.distanceKm === null, 'Distance is null when coordinates are not available');
    assert(matchAnalysis.factors.location.score >= 85, 'City/area compatibility is evaluated instead of fabricated distance');

    // ----------------------------------------------------
    // Test 5: Explanations correspond to actual matching factors
    // ----------------------------------------------------
    console.log('\n--- 4. Testing Match Explanation Quality ---');
    const explanation = matchAnalysis.explanation;
    assert(typeof explanation === 'string' && explanation.length > 10, 'Explanation is a descriptive human-readable string');
    assert(explanation.toLowerCase().includes('skill') || explanation.toLowerCase().includes('electrician'), 'Explanation references skill factor');

    // ----------------------------------------------------
    // Test 6: Database Integration — Seed test Employer, Workers, and Job
    // ----------------------------------------------------
    console.log('\n--- 5. Database Integration & Multi-Worker Recommendations ---');
    // Employer 1
    const testEmployer = await User.create({
      name: 'Step 22 Test Employer',
      email: `emp_step22_${Date.now()}@kaamsetu.test`,
      role: 'employer',
      status: 'active',
    });
    createdUserIds.push(testEmployer._id);

    // Employer 2 (For ownership testing)
    const otherEmployer = await User.create({
      name: 'Step 22 Other Employer',
      email: `other_emp_${Date.now()}@kaamsetu.test`,
      role: 'employer',
      status: 'active',
    });
    createdUserIds.push(otherEmployer._id);

    // Worker 1: Ideal match (Electrician, Pune, 5 yrs, available, 4.9 rating)
    const userWorker1 = await User.create({
      name: 'Ramesh Electrician',
      email: `ramesh_${Date.now()}@kaamsetu.test`,
      role: 'worker',
      status: 'active',
    });
    createdUserIds.push(userWorker1._id);
    await WorkerProfile.create({
      userId: userWorker1._id,
      fullName: 'Ramesh Kumar',
      primarySkill: 'electrician',
      skills: ['wiring', 'switchboard'],
      experienceYears: 5,
      dailyWage: 900,
      availability: 'available',
      rating: 4.9,
      totalReviews: 15,
      completedProjects: 8,
      location: { city: 'Pune', area: 'Kothrud', coordinates: { coordinates: [73.8567, 18.5204] } },
    });

    // Worker 2: Moderate match (Carpenter in Mumbai)
    const userWorker2 = await User.create({
      name: 'Suresh Carpenter',
      email: `suresh_${Date.now()}@kaamsetu.test`,
      role: 'worker',
      status: 'active',
    });
    createdUserIds.push(userWorker2._id);
    await WorkerProfile.create({
      userId: userWorker2._id,
      fullName: 'Suresh Carpenter',
      primarySkill: 'carpenter',
      experienceYears: 2,
      dailyWage: 1200,
      availability: 'available',
      rating: 3.5,
      totalReviews: 2,
      completedProjects: 1,
      location: { city: 'Mumbai', area: 'Dadar', coordinates: { coordinates: [72.8427, 19.0178] } },
    });

    // Worker 3: Suspended worker (Must be excluded)
    const userWorkerSuspended = await User.create({
      name: 'Suspended Worker',
      email: `suspended_${Date.now()}@kaamsetu.test`,
      role: 'worker',
      status: 'suspended',
    });
    createdUserIds.push(userWorkerSuspended._id);
    await WorkerProfile.create({
      userId: userWorkerSuspended._id,
      fullName: 'Suspended Worker',
      primarySkill: 'electrician',
      experienceYears: 10,
      dailyWage: 800,
      availability: 'available',
      location: { city: 'Pune' },
    });

    // Open Job by Test Employer
    const openJob = await Job.create({
      employerId: testEmployer._id,
      title: 'Commercial Wiring Installation',
      description: 'Need certified electrician for office rewiring',
      skillRequired: 'electrician',
      workersRequired: 1,
      wageType: 'daily',
      wageAmount: 1000,
      durationType: 'single_day',
      startDate: new Date(Date.now() + 86400000),
      location: { city: 'Pune', area: 'Kothrud', coordinates: { coordinates: [73.8560, 18.5210] } },
      status: 'open',
    });
    createdJobIds.push(openJob._id);

    // Closed Job by Test Employer
    const closedJob = await Job.create({
      employerId: testEmployer._id,
      title: 'Completed Painting Task',
      description: 'Finished task',
      skillRequired: 'painter',
      workersRequired: 1,
      wageType: 'daily',
      wageAmount: 700,
      durationType: 'single_day',
      startDate: new Date(),
      location: { city: 'Pune' },
      status: 'closed',
    });
    createdJobIds.push(closedJob._id);

    // ----------------------------------------------------
    // Test 7: recommendWorkersForJob Ranks Suitable Worker Top
    // ----------------------------------------------------
    const recWorkers = await recommendWorkersForJob(openJob._id, testEmployer._id, { limit: 10 });
    assert(Array.isArray(recWorkers.results), 'recommendWorkersForJob returns array of candidate results');
    assert(recWorkers.results.length > 0, 'Found at least one eligible worker recommendation');

    const topCandidate = recWorkers.results[0];
    assert(topCandidate.primarySkill === 'electrician', 'Top ranked worker has required primary skill (electrician)');
    assert(topCandidate.matchScore >= 80, 'Top ranked worker achieves >= 80% match score');
    assert(topCandidate.workerName === 'Ramesh Kumar', 'Ramesh Kumar is recommended first due to skill, location & experience');

    // ----------------------------------------------------
    // Test 8: Suspended Worker Exclusion
    // ----------------------------------------------------
    const suspendedFound = recWorkers.results.some((w) => w.workerId.toString() === userWorkerSuspended._id.toString());
    assert(!suspendedFound, 'Suspended worker account is strictly excluded from matching recommendations');

    // ----------------------------------------------------
    // Test 9: Closed Job Exclusion
    // ----------------------------------------------------
    const closedJobRecs = await recommendWorkersForJob(closedJob._id, testEmployer._id);
    assert(closedJobRecs.results.length === 0, 'Closed job does not receive worker recommendations');

    // ----------------------------------------------------
    // Test 10: Employer Job Ownership Security
    // ----------------------------------------------------
    let ownershipBlocked = false;
    try {
      await recommendWorkersForJob(openJob._id, otherEmployer._id);
    } catch (authErr) {
      if (authErr.status === 403) {
        ownershipBlocked = true;
      }
    }
    assert(ownershipBlocked, 'Employer cannot view recommendations for another employer’s job (403 Forbidden)');

    // ----------------------------------------------------
    // Test 11: recommendJobsForWorker Recommends Suitable Job
    // ----------------------------------------------------
    console.log('\n--- 6. Worker-Side Job Recommendations ---');
    const workerJobRecs = await recommendJobsForWorker(userWorker1._id, { limit: 10 });
    assert(Array.isArray(workerJobRecs.results), 'recommendJobsForWorker returns job results array');
    const recommendedJob = workerJobRecs.results.find((j) => j.jobId.toString() === openJob._id.toString());
    assert(!!recommendedJob, 'Worker receives open electrician job in recommendations');
    assert(recommendedJob.matchScore >= 80, 'Worker job recommendation includes high match score');
    assert(typeof recommendedJob.explanation === 'string', 'Worker job recommendation provides clear explanation why job matches');

    // ----------------------------------------------------
    // Test 12: Pagination & Missing Information Handling
    // ----------------------------------------------------
    console.log('\n--- 7. Pagination and Fairness & Transparency ---');
    const paginatedRecs = await recommendWorkersForJob(openJob._id, testEmployer._id, { page: 1, limit: 1 });
    assert(paginatedRecs.results.length === 1, 'Pagination limit=1 returns exactly 1 item per page');
    assert(paginatedRecs.pagination.totalPages >= 1, 'Pagination metadata accurately returned');

    // Fairness check: verify no sensitive traits used
    const factorsKeys = Object.keys(DEFAULT_WEIGHTS);
    const hasSensitiveTrait = factorsKeys.some((k) =>
      ['religion', 'caste', 'gender', 'race', 'ethnicity'].includes(k.toLowerCase())
    );
    assert(!hasSensitiveTrait, 'No sensitive personal traits (religion, caste, gender, ethnicity) exist in matching weights');
  } catch (err) {
    console.error('Unexpected test execution error:', err);
    failed++;
  } finally {
    // Clean up created test data
    console.log('\nCleaning up test records...');
    try {
      if (createdUserIds.length > 0) {
        await User.deleteMany({ _id: { $in: createdUserIds } });
        await WorkerProfile.deleteMany({ userId: { $in: createdUserIds } });
      }
      if (createdJobIds.length > 0) {
        await Job.deleteMany({ _id: { $in: createdJobIds } });
      }
    } catch (cleanupErr) {
      console.warn('Cleanup notice:', cleanupErr.message);
    }
    await mongoose.connection.close();
  }

  console.log('\n==================================================');
  console.log(`STEP 22 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStep22Tests();
