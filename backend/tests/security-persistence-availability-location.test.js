/**
 * KaamSetu AI — Production Security Repair, Database Persistence,
 * Worker Availability, Location Search & Hiring Workflow Test Suite
 */

import http from 'http';
import { app } from '../src/server.js';
import {
  connectTestDB,
  createTestUser,
  tracker,
} from './testHelper.js';
import {
  WorkerProfile,
  Job,
  JobApplication,
  HiringAgreement,
  User,
} from '../src/models/index.js';

export async function runSecurityPersistenceAvailabilityLocationTests() {
  console.log('\n======================================================');
  console.log('RUNNING SUITE: Security, Persistence, Availability & Location');
  console.log('======================================================\n');

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

  let server = null;
  let baseUrl = '';

  try {
    await connectTestDB();
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    const request = async (method, path, body = null, token = null) => {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      let data = null;
      try {
        data = await res.json();
      } catch (_err) {
        data = null;
      }
      return { status: res.status, data };
    };

    // -------------------------------------------------------------------------
    // 1. SETUP TEST USERS
    // -------------------------------------------------------------------------
    const uid = Date.now() + Math.floor(Math.random() * 100000);
    const { user: workerA, token: workerAToken } = await createTestUser({
      name: 'Vikas Verma Worker',
      role: 'worker',
      phone: `98221${String(uid).slice(-5)}`,
      email: `vikas_${uid}@example.com`,
    });

    const { user: workerB, token: workerBToken } = await createTestUser({
      name: 'Ramesh Shinde Worker',
      role: 'worker',
      phone: `98222${String(uid).slice(-5)}`,
      email: `ramesh_${uid}@example.com`,
    });

    const { user: employerA, token: employerAToken } = await createTestUser({
      name: 'Deshmukh Infrastructure Pune',
      role: 'employer',
      phone: `98223${String(uid).slice(-5)}`,
      email: `vikram_${uid}@example.com`,
    });

    const { user: employerB, token: employerBToken } = await createTestUser({
      name: 'Unrelated Builder Kolhapur',
      role: 'employer',
      phone: `98224${String(uid).slice(-5)}`,
      email: `unrelated_${uid}@example.com`,
    });

    // -------------------------------------------------------------------------
    // 2. WORKER PROFILE DATA PERSISTENCE & PARTIAL UPDATES
    // -------------------------------------------------------------------------
    console.log('\n--- Group 1: Worker Profile Persistence & Field Integrity ---');

    const profilePayload = {
      fullName: 'Vikas Verma Skilled Electrician',
      bio: 'Licensed industrial and residential electrician with 7 years of hands-on experience.',
      skills: ['electrician', 'wiring', 'conduit', 'maintenance'],
      primarySkill: 'electrician',
      experienceYears: 7,
      dailyWage: 900,
      hourlyRate: 130,
      location: {
        city: 'Pune',
        area: 'Kothrud',
        address: 'Flat 401, Paud Road, Kothrud',
        pincode: '411038',
        state: 'Maharashtra',
        coordinates: [73.8077, 18.5074],
      },
      languages: ['mr', 'hi', 'en'],
      isAvailableForWork: true,
    };

    // Save profile via PUT /api/workers/profile
    const saveRes = await request('PUT', '/api/workers/profile', profilePayload, workerAToken);
    assert(saveRes.status === 200 && saveRes.data?.success === true, 'Profile save request succeeds with 200 OK');
    const savedProfile = saveRes.data?.data?.profile || saveRes.data?.data;
    assert(savedProfile?.fullName === 'Vikas Verma Skilled Electrician', 'Saved full name persisted in response');
    assert(savedProfile?.city === 'Pune', 'Saved city persisted in response');
    assert(savedProfile?.area === 'Kothrud', 'Saved area persisted in response');
    assert(savedProfile?.dailyWage === 900, 'Saved daily wage persisted in response');
    assert(savedProfile?.isAvailableForWork === true, 'Availability flag true persisted in response');

    // Reload profile via GET /api/workers/profile
    const reloadRes = await request('GET', '/api/workers/profile', null, workerAToken);
    assert(reloadRes.status === 200, 'Reload profile returns 200 OK');
    const reloaded = reloadRes.data?.data?.profile || reloadRes.data?.data;
    assert(reloaded?.fullName === 'Vikas Verma Skilled Electrician', 'Reloaded profile preserves full name');
    assert(reloaded?.city === 'Pune' && reloaded?.area === 'Kothrud', 'Reloaded profile preserves city & area');
    assert(reloaded?.address === 'Flat 401, Paud Road, Kothrud', 'Reloaded profile preserves exact street address');
    assert(reloaded?.pincode === '411038', 'Reloaded profile preserves postal pincode');
    assert(reloaded?.primarySkill === 'electrician', 'Reloaded profile preserves primary trade skill');
    assert(reloaded?.languages?.includes('mr') && reloaded?.languages?.includes('en'), 'Reloaded profile preserves languages array');

    // Partial update: edit only daily wage without erasing location or skills
    const partialUpdateRes = await request('PUT', '/api/workers/profile', { dailyWage: 950 }, workerAToken);
    assert(partialUpdateRes.status === 200, 'Partial update succeeds with 200 OK');
    const partiallyUpdated = partialUpdateRes.data?.data?.profile || partialUpdateRes.data?.data;
    assert(partiallyUpdated?.dailyWage === 950, 'Updated field (daily wage) changed to 950');
    assert(partiallyUpdated?.city === 'Pune' && partiallyUpdated?.area === 'Kothrud', 'Partial update did not erase city and area');
    assert(partiallyUpdated?.skills?.includes('electrician'), 'Partial update did not erase skills list');

    // -------------------------------------------------------------------------
    // 3. WORKER AVAILABILITY STATUS CONTROLS
    // -------------------------------------------------------------------------
    console.log('\n--- Group 2: Worker Availability Toggle & Database Persistence ---');

    // Toggle to Not Available
    const availOffRes = await request(
      'PATCH',
      '/api/workers/availability',
      { isAvailableForWork: false },
      workerAToken
    );
    assert(availOffRes.status === 200, 'Worker can toggle availability to false (Not Available)');
    assert(availOffRes.data?.data?.isAvailableForWork === false, 'isAvailableForWork is false in response');
    assert(availOffRes.data?.data?.availability === 'unavailable', 'availability enum is "unavailable"');

    // Verify persisted in DB reload
    const verifyOffRes = await request('GET', '/api/workers/profile', null, workerAToken);
    const offProfile = verifyOffRes.data?.data?.profile || verifyOffRes.data?.data;
    assert(offProfile?.isAvailableForWork === false, 'Reload reflects unavailable status');

    // Toggle back to Ready for Work
    const availOnRes = await request(
      'PATCH',
      '/api/workers/availability',
      { isAvailableForWork: true },
      workerAToken
    );
    assert(availOnRes.status === 200, 'Worker can toggle availability back to true (Ready for Work)');
    assert(availOnRes.data?.data?.isAvailableForWork === true, 'isAvailableForWork is true in response');
    assert(availOnRes.data?.data?.availability === 'available', 'availability enum is "available"');

    // Unauthorized attempt: unauthenticated toggle returns 401
    const unauthAvail = await request('PATCH', '/api/workers/availability', { isAvailableForWork: false }, null);
    assert(unauthAvail.status === 401, 'Unauthenticated availability toggle rejected with 401');

    // -------------------------------------------------------------------------
    // 4. EMPLOYER DISCOVERY BY SELECTED AREA & AVAILABILITY
    // -------------------------------------------------------------------------
    console.log('\n--- Group 3: Employer Worker Discovery by Area & Availability ---');

    // Setup Worker B in Solapur who is unavailable
    await request(
      'PUT',
      '/api/workers/profile',
      {
        fullName: 'Ramesh Shinde Mason',
        skills: ['mason'],
        primarySkill: 'mason',
        experienceYears: 4,
        dailyWage: 800,
        location: { city: 'Solapur', area: 'MIDC' },
        isAvailableForWork: false,
      },
      workerBToken
    );

    // Employer searches workers in Pune with availability='available'
    const discoverPuneRes = await request(
      'GET',
      '/api/workers?city=Pune&availability=available',
      null,
      employerAToken
    );
    assert(discoverPuneRes.status === 200, 'Employer can discover workers via GET /api/workers');
    const puneWorkers = discoverPuneRes.data?.data?.workers || [];
    assert(puneWorkers.length > 0, 'Found matching worker in Pune');
    const matchedVikas = puneWorkers.find((w) => w.fullName.includes('Vikas Verma'));
    assert(Boolean(matchedVikas), 'Worker Vikas Verma found in Pune search');
    assert(matchedVikas?.isAvailableForWork === true, 'Worker marked as available for work');
    assert(matchedVikas?.city === 'Pune', 'Worker location displays city');
    assert(!matchedVikas?.phone && !matchedVikas?.email, 'Private phone and email are NOT exposed in discovery results');

    // Filter by availability: Solapur with available only should NOT return workerB
    const discoverSolapurAvailRes = await request(
      'GET',
      '/api/workers?city=Solapur&availability=available',
      null,
      employerAToken
    );
    const solapurAvail = discoverSolapurAvailRes.data?.data?.workers || [];
    const foundRamesh = solapurAvail.find((w) => w.fullName.includes('Ramesh Shinde'));
    assert(!foundRamesh, 'Unavailable worker Ramesh Shinde excluded when filtering available only');

    // -------------------------------------------------------------------------
    // 5. LOCATION PERMISSION, NEAREST JOB SEARCH & HAVERSINE DISTANCES
    // -------------------------------------------------------------------------
    console.log('\n--- Group 4: Location-Aware Job Search & Distance Calculations ---');

    // Employer creates Job in Kothrud, Pune (lat: 18.5074, lng: 73.8077)
    const jobPayload = {
      title: 'Residential Electrical Maintenance in Kothrud',
      description: 'Full house rewiring and distribution board testing.',
      skillRequired: 'Electrician',
      category: 'Electrician',
      requiredSkills: ['electrician', 'wiring'],
      wageType: 'daily',
      wageAmount: 950,
      durationType: 'single_day',
      startDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      durationDays: 2,
      location: {
        city: 'Pune',
        area: 'Kothrud',
        address: 'Plot 15, Near City Pride, Kothrud, Pune',
        coordinates: {
          type: 'Point',
          coordinates: [73.8077, 18.5074],
        },
      },
      latitude: 18.5074,
      longitude: 73.8077,
      workersRequired: 1,
    };

    const createJobRes = await request('POST', '/api/jobs', jobPayload, employerAToken);
    assert(createJobRes.status === 201, 'Employer creates location-enabled job with 201 Created');
    const createdJob = createJobRes.data?.data;
    const jobId = createdJob?.id || createdJob?._id;
    tracker.jobs.add(jobId);

    // Worker searches nearby jobs providing user coordinates (Paud Road: 18.5080, 73.8090 - ~0.15 km away)
    const nearbyJobsRes = await request(
      'GET',
      `/api/jobs?lat=18.5080&lng=73.8090&radius=10&sort=nearest`,
      null,
      workerAToken
    );
    assert(nearbyJobsRes.status === 200, 'Location job search returns 200 OK');
    const jobsList = nearbyJobsRes.data?.data?.jobs || [];
    const foundJob = jobsList.find((j) => (j._id || j.id) === jobId);
    assert(Boolean(foundJob), 'Newly created job discovered within search radius');
    assert(foundJob?.distanceKm !== undefined && foundJob?.distanceKm !== null, 'Job contains computed distanceKm');
    assert(foundJob.distanceKm < 5, 'Job calculated distance is accurate (< 5 km)');

    // Verify employer phone and email are NOT exposed in public job card
    assert(!foundJob?.employerId?.phone, 'Employer phone is NOT exposed in public job search response');
    assert(!foundJob?.employerId?.email, 'Employer email is NOT exposed in public job search response');

    // Single job view also redacts private employer phone and email
    const singleJobRes = await request('GET', `/api/jobs/${jobId}`, null, workerAToken);
    assert(singleJobRes.status === 200, 'Worker can view single job details');
    const singleJob = singleJobRes.data?.data;
    assert(!singleJob?.employerId?.phone, 'Employer phone redacted in single job view');
    assert(!singleJob?.employerId?.email, 'Employer email redacted in single job view');

    // -------------------------------------------------------------------------
    // 6. HIRING AGREEMENT CONFIRMATION & CONTACT DETAILS REVEAL
    // -------------------------------------------------------------------------
    console.log('\n--- Group 5: Hiring Privacy Lockdown & Post-Confirmation Reveal ---');

    // Employer creates hiring agreement proposal for worker A
    // First, create a selected job application to satisfy proposal prerequisites
    const testApp = await JobApplication.create({
      jobId,
      workerId: workerA._id,
      proposedWage: 950,
      coverNote: 'Ready for electrical work',
      status: 'selected',
    });
    tracker.applications.add(testApp._id || testApp.id);

    const agreementPayload = {
      sourceType: 'application',
      sourceId: String(testApp._id || testApp.id),
      jobId,
      workerId: workerA._id,
      wageType: 'daily',
      proposedWage: 950,
      agreedWage: 950,
      durationType: 'single_day',
      startDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      message: 'Complete work according to residential code.',
    };

    const createAgrRes = await request('POST', '/api/hiring', agreementPayload, employerAToken);
    assert(createAgrRes.status === 201, 'Hiring agreement proposal created with 201 Created');
    const agreementId = createAgrRes.data?.data?.id || createAgrRes.data?.data?._id;
    tracker.agreements.add(agreementId);

    // BEFORE mutual confirmation: Status is pending_worker.
    // Dedicated /contact endpoint MUST reject access with 403 Forbidden!
    const preConfirmContactRes = await request('GET', `/api/hiring/${agreementId}/contact`, null, workerAToken);
    assert(preConfirmContactRes.status === 403, 'Contact details DENIED with 403 before mutual confirmation');

    // Worker accepts hiring agreement -> status becomes 'confirmed'
    const acceptRes = await request('POST', `/api/hiring/${agreementId}/accept`, {}, workerAToken);
    assert(acceptRes.status === 200, 'Worker accepts hiring agreement successfully');
    assert(acceptRes.data?.data?.status === 'confirmed', 'Agreement status transitions to "confirmed"');

    // AFTER mutual confirmation:
    // Authorized Worker calls /contact endpoint -> returns employer direct phone and site address!
    const postConfirmContactRes = await request('GET', `/api/hiring/${agreementId}/contact`, null, workerAToken);
    assert(postConfirmContactRes.status === 200, 'Authorized worker can access contact details after confirmation');
    const contactData = postConfirmContactRes.data?.data;
    assert(contactData?.employer?.phone === employerA.phone, 'Employer direct phone unlocked for authorized worker');
    assert(contactData?.employer?.email === employerA.email, 'Employer email unlocked for authorized worker');
    assert(Boolean(contactData?.job?.address), 'Confirmed job site street address provided to authorized worker');

    // Unrelated Worker B attempts to access contact details -> 403 Forbidden!
    const intruderWorkerRes = await request('GET', `/api/hiring/${agreementId}/contact`, null, workerBToken);
    assert(intruderWorkerRes.status === 403, 'Unrelated Worker B denied access with 403 Forbidden (IDOR protected)');

    // Unrelated Employer B attempts to access contact details -> 403 Forbidden!
    const intruderEmployerRes = await request('GET', `/api/hiring/${agreementId}/contact`, null, employerBToken);
    assert(intruderEmployerRes.status === 403, 'Unrelated Employer B denied access with 403 Forbidden (IDOR protected)');

    // -------------------------------------------------------------------------
    // 7. SECURITY & LIVENESS CHECKS
    // -------------------------------------------------------------------------
    console.log('\n--- Group 6: System Health & Security Controls ---');

    const healthRes = await request('GET', '/health', null, null);
    assert(healthRes.status === 200, 'Liveness endpoint /health returns 200 OK');

    const readyRes = await request('GET', '/health/ready', null, null);
    assert(readyRes.status === 200 || readyRes.status === 503, 'Readiness endpoint /health/ready returns truthful status');

    console.log('\n======================================================');
    console.log(`ALL TESTS PASSED: ${passed}/${total}`);
    console.log('======================================================\n');
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  }
}

// Auto-execute if run directly
if (process.argv[1] && process.argv[1].endsWith('security-persistence-availability-location.test.js')) {
  runSecurityPersistenceAvailabilityLocationTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('\nTest Suite Failed:', err);
      process.exit(1);
    });
}
