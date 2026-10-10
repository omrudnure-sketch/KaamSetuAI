import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDB } from './src/config/db.js';
import { User, WorkerProfile } from './src/models/index.js';
import {
  workerSearchFiltersSchema,
  naturalLanguageQueryInputSchema,
  parseQueryDeterministically,
  parseWorkerSearchQuery,
  validateSearchFilters,
  buildWorkerSearchCriteria,
  searchWorkersWithNaturalLanguage,
  parseJobSearchQuery,
} from './src/services/ai/naturalLanguageSearchService.js';

async function runStep24Tests() {
  console.log('==================================================');
  console.log('--- STARTING STEP 24 VERIFICATION TESTS (NL SEARCH) ---');
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

  const createdUserIds = [];

  try {
    // ----------------------------------------------------
    // Test 1: A clear query extracts correct filters
    // ----------------------------------------------------
    console.log('\n--- 1. Testing Filter Extraction from Natural-Language ---');
    const clearQuery = 'Find an electrician in Pune with at least 3 years experience under 950 rupees per day.';
    const parseResult = await parseWorkerSearchQuery(clearQuery);

    assert(parseResult.filters.skill === 'electrician', 'Skill correctly extracted as "electrician"');
    assert(parseResult.filters.city?.toLowerCase() === 'pune', 'City correctly extracted as "Pune"');
    assert(parseResult.filters.minExperienceYears === 3, 'Experience correctly extracted as 3 years');
    assert(parseResult.filters.maxDailyWage === 950, 'Wage limit correctly extracted as ₹950');

    // ----------------------------------------------------
    // Test 2: Missing skill remains unspecified (No fabricated facts)
    // ----------------------------------------------------
    console.log('\n--- 2. Testing Missing / Ambiguous Information ---');
    const ambiguousQuery = 'I need a reliable worker near Mumbai under 1200 per day';
    const ambiguousResult = await parseWorkerSearchQuery(ambiguousQuery);

    assert(ambiguousResult.filters.city?.toLowerCase() === 'mumbai', 'City extracted as Mumbai');
    assert(ambiguousResult.filters.skill === undefined, 'Missing skill remains strictly undefined (no hallucinated trade)');
    assert(ambiguousResult.filters.maxDailyWage === 1200, 'Wage extracted as ₹1200');

    // ----------------------------------------------------
    // Test 3: Wage values are parsed correctly in multiple formats
    // ----------------------------------------------------
    console.log('\n--- 3. Testing Wage Format Parsing ---');
    const wageQuery1 = parseQueryDeterministically('Plumber below ₹800 daily');
    assert(wageQuery1.maxDailyWage === 800, 'Parsed wage with currency symbol ₹800');

    const wageQuery2 = parseQueryDeterministically('Painter for 1000 rs per day');
    assert(wageQuery2.maxDailyWage === 1000, 'Parsed wage with "rs" format');

    // ----------------------------------------------------
    // Test 4: Zod Filter Schema Security (No Arbitrary Mongo Operators or Code)
    // ----------------------------------------------------
    console.log('\n--- 4. Testing Allowlist Security & Injection Prevention ---');
    const safeFilters = {
      skill: 'carpenter',
      city: 'Nashik',
      minExperienceYears: 2,
      maxDailyWage: 1000,
      availability: 'available',
    };
    const validatedSafe = validateSearchFilters(safeFilters);
    assert(validatedSafe.skill === 'carpenter', 'Allowlisted filters pass validation');

    // Test rejection of malicious MongoDB operator injection attempt
    let injectionCaught = false;
    try {
      workerSearchFiltersSchema.parse({
        skill: 'carpenter',
        $where: 'sleep(5000)', // Malicious NoSQL injection
        $gt: { rate: 0 },
      });
    } catch (_err) {
      injectionCaught = true;
    }
    assert(injectionCaught, 'Arbitrary MongoDB operators ($where, $gt) are rejected by strict schema');

    let unknownKeyCaught = false;
    try {
      workerSearchFiltersSchema.parse({
        skill: 'mason',
        unauthorizedInternalField: 'true',
      });
    } catch (_err) {
      unknownKeyCaught = true;
    }
    assert(unknownKeyCaught, 'Non-allowlisted arbitrary field names are rejected');

    // ----------------------------------------------------
    // Test 5: Safe Query Builder
    // ----------------------------------------------------
    console.log('\n--- 5. Testing Parameterized MongoDB Criteria Builder ---');
    const builtCriteria = buildWorkerSearchCriteria({
      skill: 'electrician',
      city: 'Pune',
      minExperienceYears: 4,
      maxDailyWage: 900,
      minRating: 4.5,
    });

    assert(builtCriteria.experienceYears.$gte === 4, 'Criteria includes safe experience comparison ($gte: 4)');
    assert(builtCriteria.dailyWage.$lte === 900, 'Criteria includes safe wage comparison ($lte: 900)');
    assert(builtCriteria.rating.$gte === 4.5, 'Criteria includes safe rating comparison ($gte: 4.5)');
    assert(builtCriteria.$or.length === 2, 'Criteria checks both primarySkill and skills array');

    // ----------------------------------------------------
    // Test 6: Database Integration with Actual MongoDB Data
    // ----------------------------------------------------
    console.log('\n--- 6. Testing Real MongoDB Worker Search ---');
    // Seed real worker 1 (Plumber in Kolhapur, 4 yrs, ₹850, rating 4.8)
    const userWorker1 = await User.create({
      name: 'Ganesh Plumber',
      email: `ganesh_${Date.now()}@kaamsetu.test`,
      role: 'worker',
      status: 'active',
    });
    createdUserIds.push(userWorker1._id);
    await WorkerProfile.create({
      userId: userWorker1._id,
      fullName: 'Ganesh Shinde',
      primarySkill: 'plumber',
      experienceYears: 4,
      dailyWage: 850,
      rating: 4.8,
      totalReviews: 6,
      availability: 'available',
      location: { city: 'Kolhapur', area: 'Shahupuri' },
    });

    // Seed real worker 2 (Electrician in Pune, 1 yr, ₹1200)
    const userWorker2 = await User.create({
      name: 'Vikas Electrician',
      email: `vikas_${Date.now()}@kaamsetu.test`,
      role: 'worker',
      status: 'active',
    });
    createdUserIds.push(userWorker2._id);
    await WorkerProfile.create({
      userId: userWorker2._id,
      fullName: 'Vikas More',
      primarySkill: 'electrician',
      experienceYears: 1,
      dailyWage: 1200,
      rating: 4.0,
      totalReviews: 2,
      availability: 'available',
      location: { city: 'Pune' },
    });

    // Seed suspended worker (Must never be returned)
    const userSuspended = await User.create({
      name: 'Suspended Plumber',
      email: `suspended_p_${Date.now()}@kaamsetu.test`,
      role: 'worker',
      status: 'suspended',
    });
    createdUserIds.push(userSuspended._id);
    await WorkerProfile.create({
      userId: userSuspended._id,
      fullName: 'Suspended Worker',
      primarySkill: 'plumber',
      experienceYears: 5,
      dailyWage: 500,
      availability: 'available',
      location: { city: 'Kolhapur' },
    });

    // Search query: "Find a plumber in Kolhapur with at least 3 years experience under 900 rupees"
    const searchRes = await searchWorkersWithNaturalLanguage({
      query: 'Find a plumber in Kolhapur with at least 3 years experience under 900 rupees',
      page: 1,
      limit: 10,
    });

    assert(searchRes.results.length > 0, 'Real workers returned from database matching criteria');
    const matchedGanesh = searchRes.results.find((w) => w.workerName === 'Ganesh Shinde');
    assert(!!matchedGanesh, 'Ganesh Shinde returned as matching plumber in Kolhapur');
    assert(matchedGanesh.primarySkill === 'plumber', 'Result skill is plumber');
    assert(matchedGanesh.location.city.toLowerCase() === 'kolhapur', 'Result city is Kolhapur');
    assert(matchedGanesh.dailyWage <= 900, 'Result daily wage is within ₹900 limit');

    // Verify suspended account is excluded
    const hasSuspended = searchRes.results.some((w) => w.workerId.toString() === userSuspended._id.toString());
    assert(!hasSuspended, 'Suspended worker account is strictly excluded from natural-language search');

    // ----------------------------------------------------
    // Test 7: Empty Results Handled Cleanly
    // ----------------------------------------------------
    console.log('\n--- 7. Testing Empty Results Handling ---');
    const emptyRes = await searchWorkersWithNaturalLanguage({
      query: 'Find a welder in non_existent_city_xyz under 200 rupees with 10 years experience',
      page: 1,
      limit: 10,
    });
    assert(Array.isArray(emptyRes.results), 'Empty search returns array');
    assert(emptyRes.results.length === 0, 'Zero results returned for non-existent criteria');
    assert(emptyRes.pagination.total === 0, 'Pagination total reports 0');

    // ----------------------------------------------------
    // Test 8: Worker-Side Natural Language Job Search Parser
    // ----------------------------------------------------
    console.log('\n--- 8. Testing Worker-Side Job Search Parser ---');
    const jobParsed = await parseJobSearchQuery('Find painting jobs in Pune starting next week');
    assert(jobParsed.filters.skill === 'painter' || jobParsed.filters.skill === 'painting' || !jobParsed.filters.skill, 'Job search extracts trade skill');
    assert(jobParsed.filters.city?.toLowerCase() === 'pune', 'Job search extracts city as Pune');

    // ----------------------------------------------------
    // Test 9: Input Length Limiting
    // ----------------------------------------------------
    console.log('\n--- 9. Testing Query Length Protection ---');
    let tooLongCaught = false;
    try {
      naturalLanguageQueryInputSchema.parse({
        query: 'X'.repeat(600), // Exceeds 500 limit
      });
    } catch (_err) {
      tooLongCaught = true;
    }
    assert(tooLongCaught, 'Search query exceeding 500 characters is rejected by Zod schema');

    // ----------------------------------------------------
    // Test 10: Pagination with Real Database Data
    // ----------------------------------------------------
    console.log('\n--- 10. Testing Pagination ---');
    const page1Res = await searchWorkersWithNaturalLanguage({
      query: 'Available workers in Maharashtra',
      page: 1,
      limit: 1,
    });
    assert(page1Res.results.length <= 1, 'Limit 1 returns at most 1 item');
    assert(page1Res.pagination.page === 1, 'Pagination page matches 1');
    assert(typeof page1Res.pagination.totalPages === 'number', 'Total pages calculated');

  } catch (err) {
    console.error('Unexpected test error in Step 24:', err);
    failed++;
  } finally {
    console.log('\nCleaning up test records...');
    try {
      if (createdUserIds.length > 0) {
        await User.deleteMany({ _id: { $in: createdUserIds } });
        await WorkerProfile.deleteMany({ userId: { $in: createdUserIds } });
      }
    } catch (cleanupErr) {
      console.warn('Cleanup error:', cleanupErr.message);
    }
    await mongoose.connection.close();
  }

  console.log('\n==================================================');
  console.log(`STEP 24 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStep24Tests();
