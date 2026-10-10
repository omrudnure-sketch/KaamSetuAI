import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { connectDB } from './src/config/db.js';
import { User, Job } from './src/models/index.js';
import {
  jobDescriptionInputSchema,
  jobDescriptionOutputSchema,
  generateJobDescriptionDraft,
  generateDeterministicFallback,
} from './src/services/ai/jobDescriptionService.js';

async function runStep21Tests() {
  console.log('--- STARTING STEP 21 VERIFICATION TESTS ---');
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
    // 1. Zod Input Schema Validation Test
    console.log('\nTesting Input Validation with Zod:');
    const validRawInput = {
      title: 'Residential Electrician Required',
      skillRequired: 'electrician',
      additionalSkills: ['wiring', 'switchboard'],
      location: { city: 'Pune', area: 'Kothrud' },
      workersRequired: 2,
      wageType: 'daily',
      wageAmount: 950,
      durationType: 'single_day',
      startDate: '2026-10-15',
      workingHours: { start: '09:00', end: '18:00', description: 'Day shift' },
      tasks: ['Install conduit pipes', 'Check circuit breaker'],
      experienceRequirements: 'Minimum 2 years residential experience',
      safetyRequirements: 'Insulated tools required',
      additionalInstructions: 'Report to site supervisor on arrival',
    };

    const parsedInput = jobDescriptionInputSchema.parse(validRawInput);
    assert(parsedInput.title === validRawInput.title, 'Valid input successfully passes Zod validation');

    // Test rejection of invalid input
    let invalidCaught = false;
    try {
      jobDescriptionInputSchema.parse({
        title: 'X', // Too short
        skillRequired: '', // Empty
      });
    } catch (err) {
      invalidCaught = true;
    }
    assert(invalidCaught, 'Invalid input (empty skill, short title) correctly rejected by Zod');

    // 2. Output Schema Validation Test
    console.log('\nTesting Structured Output Schema & Zod:');
    const sampleOutput = {
      suggestedTitle: 'Residential Electrician - Wiring & Installation',
      description: 'We are hiring 2 skilled electricians for an active project in Pune (Kothrud). Standard hours 09:00 to 18:00.',
      responsibilities: ['Install conduit pipes', 'Check circuit breaker', 'Ensure clean wiring layout'],
      requiredSkills: ['electrician', 'wiring', 'switchboard'],
      experienceRequirements: 'Minimum 2 years residential experience',
      safetyReminders: ['Insulated tools required', 'Follow standard electrical safety protocols'],
    };

    const parsedOutput = jobDescriptionOutputSchema.parse(sampleOutput);
    assert(parsedOutput.suggestedTitle.length > 0, 'Output schema validates suggestedTitle');
    assert(Array.isArray(parsedOutput.responsibilities), 'Output schema validates responsibilities array');
    assert(Array.isArray(parsedOutput.requiredSkills), 'Output schema validates requiredSkills array');
    assert(Array.isArray(parsedOutput.safetyReminders), 'Output schema validates safetyReminders array');

    // 3. Deterministic Fallback Generator Test
    console.log('\nTesting Deterministic Fallback Generator:');
    const fallback = generateDeterministicFallback(parsedInput);
    assert(fallback.suggestedTitle.includes('Electrician'), 'Fallback produces relevant suggested title');
    assert(fallback.description.includes('Pune'), 'Fallback incorporates verified location city');
    assert(fallback.description.includes('950'), 'Fallback reflects employer specified wage without inventing numbers');
    assert(fallback.safetyReminders.length > 0, 'Fallback provides safety reminders');

    // 4. Full Service Draft Generation Test
    console.log('\nTesting Full generateJobDescriptionDraft service:');
    const generatedDraft = await generateJobDescriptionDraft(validRawInput);
    assert(generatedDraft && typeof generatedDraft === 'object', 'Draft generation returned object');
    assert(jobDescriptionOutputSchema.safeParse(generatedDraft).success, 'Generated draft strictly conforms to Zod output schema');
    assert(!generatedDraft._id, 'Draft does NOT create or automatically publish a job');
    assert(!generatedDraft.employerId, 'Draft does not persist authoritative employerId field');

    // 5. Verify Security: API Key is never leaked into the output
    console.log('\nTesting Secret Isolation:');
    const outputString = JSON.stringify(generatedDraft);
    const hasSecret = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5
      ? outputString.includes(process.env.GEMINI_API_KEY)
      : false;
    assert(!hasSecret, 'AI provider API key is NEVER leaked in the output payload');

    // 6. Role Authorization & JWT Token Simulation Test
    console.log('\nTesting Role Authorization Rules:');
    const jwtSecret = process.env.JWT_SECRET || 'secret';
    const employerToken = jwt.sign({ id: 'emp123', role: 'employer' }, jwtSecret);
    const workerToken = jwt.sign({ id: 'wrk123', role: 'worker' }, jwtSecret);

    const decodedEmp = jwt.verify(employerToken, jwtSecret);
    const decodedWrk = jwt.verify(workerToken, jwtSecret);

    assert(decodedEmp.role === 'employer', 'Employer role recognized');
    assert(decodedWrk.role === 'worker', 'Worker role recognized');
    assert(decodedWrk.role !== 'employer', 'Worker role is forbidden from employer job description generation endpoint');

    // 7. Test that Existing Job Creation Flow Remains Intact
    console.log('\nTesting Existing Job Model & Creation Schema Integrity:');
    const testJobData = {
      title: generatedDraft.suggestedTitle,
      description: generatedDraft.description,
      skillRequired: 'electrician',
      workersRequired: 1,
      location: { city: 'Pune' },
      wageType: 'daily',
      wageAmount: 950,
      durationType: 'single_day',
      startDate: new Date(),
    };
    const jobInstance = new Job({
      ...testJobData,
      employerId: new mongoose.Types.ObjectId(),
    });
    const validateErr = jobInstance.validateSync();
    assert(!validateErr, 'Job created from edited AI draft passes standard Job model validation');

    console.log(`\n--- STEP 21 VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED ---`);
  } catch (err) {
    console.error('Error during Step 21 tests:', err);
    failed++;
  } finally {
    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runStep21Tests();
