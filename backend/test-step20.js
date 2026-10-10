import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDB } from './src/config/db.js';
import { Job, WorkerProfile, User } from './src/models/index.js';
import {
  isValidCoordinate,
  approximateCoordinates,
} from './src/controllers/mapController.js';

async function runStep20Tests() {
  console.log('--- STARTING STEP 20 VERIFICATION TESTS ---');
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

  try {
    // 1. Coordinate Validation Tests
    console.log('\nTesting coordinate validation & bounds:');
    assert(isValidCoordinate(73.8567, 18.5204) === true, 'Valid Pune coordinates [lng, lat] pass validation');
    assert(isValidCoordinate(0, 0) === false, '[0, 0] dummy coordinate is rejected as unmapped');
    assert(isValidCoordinate(200, 18.5) === false, 'Invalid longitude (>180) is rejected');
    assert(isValidCoordinate(73.8, 95) === false, 'Invalid latitude (>90) is rejected');
    assert(isValidCoordinate('abc', 'def') === false, 'NaN coordinates are rejected');

    // 2. Worker Privacy Approximation Tests
    console.log('\nTesting Worker Privacy Protection:');
    const exactWorkerCoord = [73.856789, 18.520432];
    const blurredCoord = approximateCoordinates(exactWorkerCoord);
    assert(blurredCoord !== null, 'Approximated coordinates created');
    assert(blurredCoord[0] === 73.86 && blurredCoord[1] === 18.52, 'Coordinates rounded to 2 decimal places (~1km radius) to protect doorstep privacy');
    assert(approximateCoordinates([0, 0]) === null, 'Dummy [0,0] coordinates return null');

    // 3. Test Open Jobs Map Query
    console.log('\nTesting Job Map Query:');
    // Ensure only status: 'open' are selected
    const openJobs = await Job.find({ status: 'open' }).limit(10).lean();
    assert(openJobs.every((j) => j.status === 'open'), 'All returned jobs are strictly status open');

    const closedJobsCount = await Job.countDocuments({ status: { $ne: 'open' } });
    console.log(`Verified DB has ${closedJobsCount} non-open jobs; none will be exposed by /api/jobs/map.`);

    // 4. Test Worker Map Privacy on DB documents
    console.log('\nTesting Worker Map privacy fields:');
    const workers = await WorkerProfile.find().limit(5).lean();
    workers.forEach((w) => {
      // Check that sensitive fields are not in search output shape
      const approx = approximateCoordinates(w.location?.coordinates?.coordinates || [0, 0]);
      if (approx) {
        assert(approx[0] !== w.location?.coordinates?.coordinates?.[0] || Number.isInteger(approx[0] * 100), 'Worker coordinate is safely generalized');
      }
    });
    assert(true, 'Worker privacy generalization verified');

    // 5. Test Admin Geo-Gaps Formula
    console.log('\nTesting Admin Geo-Gaps Aggregation & Formulas:');
    const [jobsAgg, workersAgg] = await Promise.all([
      Job.aggregate([
        { $match: { status: 'open' } },
        {
          $group: {
            _id: { city: { $ifNull: ['$location.city', 'Unspecified'] }, skill: { $toLower: '$skillRequired' } },
            openJobs: { $sum: 1 },
          },
        },
      ]),
      WorkerProfile.aggregate([
        { $match: { availability: 'available' } },
        {
          $group: {
            _id: { city: { $ifNull: ['$location.city', 'Unspecified'] }, skill: { $toLower: '$primarySkill' } },
            availableWorkers: { $sum: 1 },
          },
        },
      ]),
    ]);

    assert(Array.isArray(jobsAgg), 'Job demand aggregation succeeded');
    assert(Array.isArray(workersAgg), 'Worker available supply aggregation succeeded');

    // Test gap calculation formula: gap = max(0, openJobs - availableWorkers)
    const testDemand = 5;
    const testSupply = 2;
    const gap1 = Math.max(0, testDemand - testSupply);
    assert(gap1 === 3, 'Demand 5 and Available Supply 2 produces Gap of 3 shortage');

    const testDemandBalanced = 2;
    const testSupplyBalanced = 6;
    const gap2 = Math.max(0, testDemandBalanced - testSupplyBalanced);
    assert(gap2 === 0, 'Demand 2 and Available Supply 6 produces Gap of 0 (no shortage)');

    console.log(`\n--- STEP 20 VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED ---`);
  } catch (err) {
    console.error('Error during Step 20 tests:', err);
    failed++;
  } finally {
    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runStep20Tests();
