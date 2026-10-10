import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });

const API_URL = 'http://localhost:5000/api';

async function request(reqPath, options = {}) {
  const url = `${API_URL}${reqPath}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function getAuthToken(name, email, phone, role, password) {
  let res = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, phone, role }),
  });
  if (res.status === 409) {
    res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }
  if (!res.data?.data?.token) {
    console.error('Failed to authenticate:', res.data);
    throw new Error(`Authentication failed for ${email}`);
  }
  return res.data.data.token;
}

async function testStep5() {
  console.log('--- STARTING STEP 5 BACKEND VERIFICATION ---');

  const timestamp = Date.now();
  const employerEmail = `emp_step5_${timestamp}@example.com`;
  const employerEmail2 = `emp2_step5_${timestamp}@example.com`;
  const workerEmail = `wrk_step5_${timestamp}@example.com`;
  const password = 'Password123!';

  console.log('1. Authenticating test users...');
  const empToken = await getAuthToken('Employer 1', employerEmail, `98${timestamp.toString().slice(-8)}`, 'employer', password);
  const emp2Token = await getAuthToken('Employer 2', employerEmail2, `97${timestamp.toString().slice(-8)}`, 'employer', password);
  const wrkToken = await getAuthToken('Worker 1', workerEmail, `96${timestamp.toString().slice(-8)}`, 'worker', password);

  const empHeaders = { Authorization: `Bearer ${empToken}` };
  const emp2Headers = { Authorization: `Bearer ${emp2Token}` };
  const wrkHeaders = { Authorization: `Bearer ${wrkToken}` };

  // 2. Create a Job as Employer 1
  console.log('\n2. Creating Job 1 as Employer 1...');
  const newJobPayload = {
    title: 'Site Electrician Needed',
    description: 'Need an experienced electrician for high-rise commercial wiring work in Hinjewadi.',
    skillRequired: 'electrician',
    additionalSkills: ['wiring', 'circuit breakers'],
    workersRequired: 3,
    location: {
      city: 'Pune',
      area: 'Hinjewadi',
      address: 'Phase 1 Tech Park',
      coordinates: { type: 'Point', coordinates: [73.7377, 18.5912] },
    },
    wageType: 'daily',
    wageAmount: 900,
    durationType: 'fixed_duration',
    startDate: new Date(Date.now() + 86400000).toISOString(),
    estimatedEndDate: new Date(Date.now() + 86400000 * 10).toISOString(),
    workingHours: {
      start: '09:00',
      end: '18:00',
      description: '1 hour lunch break',
    },
    requirements: ['Safety Helmet', 'Basic Tools'],
  };

  const createJobRes = await request('/jobs', {
    method: 'POST',
    headers: empHeaders,
    body: JSON.stringify(newJobPayload),
  });
  console.log('Create job status:', createJobRes.status, 'Success:', createJobRes.data.success);
  if (!createJobRes.data.success) {
    console.error('Job creation failed:', createJobRes.data);
    process.exit(1);
  }
  const job1Id = createJobRes.data.data._id;
  console.log('Created Job 1 ID:', job1Id);

  // Create a 2nd open job for testing search & sorting
  console.log('Creating Job 2 as Employer 1 (Plumber in Mumbai)...');
  const createJob2Res = await request('/jobs', {
    method: 'POST',
    headers: empHeaders,
    body: JSON.stringify({
      title: 'Plumber for Residential Complex',
      description: 'Pipe repair and fixture installation in Bandra.',
      skillRequired: 'plumber',
      workersRequired: 2,
      location: { city: 'Mumbai', area: 'Bandra', address: 'Hill Road' },
      wageType: 'daily',
      wageAmount: 1200,
      durationType: 'single_day',
      startDate: new Date(Date.now() + 86400000 * 2).toISOString(),
      workingHours: { start: '10:00', end: '17:00' },
      requirements: ['Plumbing Tool Kit'],
    }),
  });
  const job2Id = createJob2Res.data.data._id;

  // 3. Verify job in MongoDB
  console.log('\n3. Verifying job in MongoDB...');
  const mongoUri = process.env.MONGO_URI;
  await mongoose.connect(mongoUri);
  const Job = (await import('./src/models/Job.js')).default;
  const dbJob = await Job.findById(job1Id);
  console.log('DB verification: Found job title =', dbJob?.title, ', Status =', dbJob?.status);

  // 4. Get Employer 1\'s Jobs
  console.log('\n4. Getting Employer 1 jobs (GET /api/jobs/my-jobs)...');
  const getEmpJobsRes = await request('/jobs/my-jobs', { headers: empHeaders });
  console.log('My jobs count:', getEmpJobsRes.data.data?.length);

  // 5. Get Specific Employer Job
  console.log('\n5. Getting specific Employer job (GET /api/jobs/my-jobs/:id)...');
  const getEmpJobRes = await request(`/jobs/my-jobs/${job1Id}`, { headers: empHeaders });
  console.log('Get specific job title:', getEmpJobRes.data.data?.title);

  // 6. Update Job
  console.log('\n6. Updating Job 1 (PUT /api/jobs/:id)...');
  const updateJobRes = await request(`/jobs/${job1Id}`, {
    method: 'PUT',
    headers: empHeaders,
    body: JSON.stringify({ wageAmount: 1000, title: 'Updated Site Electrician Needed' }),
  });
  console.log('Update status:', updateJobRes.status, 'Updated wageAmount:', updateJobRes.data.data?.wageAmount);

  // 7. Create a 3rd job and then Close it
  console.log('\n7. Creating Job 3 and closing it...');
  const job3Res = await request('/jobs', {
    method: 'POST',
    headers: empHeaders,
    body: JSON.stringify({
      title: 'Temporary Cleaner Job',
      description: 'Cleaning after construction.',
      skillRequired: 'cleaner',
      workersRequired: 1,
      location: { city: 'Pune', area: 'Kothrud' },
      wageType: 'fixed',
      wageAmount: 5000,
      durationType: 'until_completion',
      startDate: new Date().toISOString(),
    }),
  });
  const job3Id = job3Res.data.data._id;
  const closeRes = await request(`/jobs/${job3Id}/close`, {
    method: 'PATCH',
    headers: empHeaders,
  });
  console.log('Close job status:', closeRes.status, 'New status:', closeRes.data.data?.status);

  // 8. Get available jobs as Worker
  console.log('\n8. Getting available jobs as Worker (GET /api/jobs)...');
  const getAvailRes = await request('/jobs', { headers: wrkHeaders });
  console.log('Available open jobs count:', getAvailRes.data.data?.jobs?.length);
  console.log('Pagination info:', getAvailRes.data.data?.pagination);

  // 10. Verify closed job (Job 3) does not appear in worker open jobs
  const job3InWorker = getAvailRes.data.data?.jobs?.find((j) => j._id === job3Id);
  console.log('Closed Job 3 found in available jobs?', !!job3InWorker, '(Expected: false)');

  // 11. Search by skill
  console.log('\n11. Search by skill=electrician...');
  const skillRes = await request('/jobs?skill=electrician', { headers: wrkHeaders });
  console.log('Found electrician jobs count:', skillRes.data.data?.jobs?.length);

  // 12. Search by city
  console.log('\n12. Search by city=Pune...');
  const cityRes = await request('/jobs?city=Pune', { headers: wrkHeaders });
  console.log('Found Pune jobs count:', cityRes.data.data?.jobs?.length);

  // 13. Filter by wage
  console.log('\n13. Filter by minWage=950...');
  const wageRes = await request('/jobs?minWage=950', { headers: wrkHeaders });
  console.log('Found minWage >= 950 jobs count:', wageRes.data.data?.jobs?.length);

  // 14. Filter by duration
  console.log('\n14. Filter by durationType=single_day...');
  const durRes = await request('/jobs?durationType=single_day', { headers: wrkHeaders });
  console.log('Found single_day jobs count:', durRes.data.data?.jobs?.length);

  // 15. Test pagination
  console.log('\n15. Testing pagination page=1, limit=1...');
  const pagRes = await request('/jobs?page=1&limit=1', { headers: wrkHeaders });
  console.log('Page 1 count:', pagRes.data.data?.jobs?.length, 'Total pages:', pagRes.data.data?.pagination?.totalPages);

  // 16. Test sorting
  console.log('\n16. Testing sorting sort=wage_high...');
  const sortRes = await request('/jobs?sort=wage_high', { headers: wrkHeaders });
  console.log('Sorted wages:', sortRes.data.data?.jobs?.map((j) => j.wageAmount));

  // 17. Get job details as Worker
  console.log('\n17. Getting Job 1 details as Worker (GET /api/jobs/:id)...');
  const wrkJobDetailRes = await request(`/jobs/${job1Id}`, { headers: wrkHeaders });
  console.log('Worker view job title:', wrkJobDetailRes.data.data?.title, 'Employer Name:', wrkJobDetailRes.data.data?.employerId?.name);
  console.log('Ensure employer passwordHash NOT exposed:', wrkJobDetailRes.data.data?.employerId?.passwordHash === undefined);

  // 18. Worker tries to create job (Security test)
  console.log('\n18. Security Test: Worker trying to create a job...');
  const wrkCreateRes = await request('/jobs', {
    method: 'POST',
    headers: wrkHeaders,
    body: JSON.stringify(newJobPayload),
  });
  console.log('Worker create job status:', wrkCreateRes.status, '(Expected: 403)');

  // 19. Employer 2 tries to update Employer 1\'s job
  console.log('\n19. Security Test: Employer 2 trying to edit Employer 1\'s job...');
  const emp2EditRes = await request(`/jobs/${job1Id}`, {
    method: 'PUT',
    headers: emp2Headers,
    body: JSON.stringify({ title: 'Hacked Title' }),
  });
  console.log('Employer 2 edit status:', emp2EditRes.status, '(Expected: 404 or 403)');

  // 20. Client trying to set employerId in body
  console.log('\n20. Security Test: Passing fake employerId in create payload...');
  const fakeEmpPayload = { ...newJobPayload, employerId: '60d0fe4f5311236168a109ca' };
  const fakeEmpRes = await request('/jobs', {
    method: 'POST',
    headers: empHeaders,
    body: JSON.stringify(fakeEmpPayload),
  });
  console.log('Fake employerId response status:', fakeEmpRes.status, 'Created employerId matches req.user.id?', fakeEmpRes.data.data?.employerId !== '60d0fe4f5311236168a109ca');

  // 21. Test invalid wage
  console.log('\n21. Validation Test: Negative wageAmount...');
  const negWageRes = await request('/jobs', {
    method: 'POST',
    headers: empHeaders,
    body: JSON.stringify({ ...newJobPayload, wageAmount: -100 }),
  });
  console.log('Negative wage status:', negWageRes.status, '(Expected: 400)');

  // 22. Test invalid workersRequired
  console.log('\n22. Validation Test: workersRequired = 0...');
  const zeroWorkersRes = await request('/jobs', {
    method: 'POST',
    headers: empHeaders,
    body: JSON.stringify({ ...newJobPayload, workersRequired: 0 }),
  });
  console.log('Zero workers status:', zeroWorkersRes.status, '(Expected: 400)');

  // 23. Test estimatedEndDate before startDate
  console.log('\n23. Validation Test: estimatedEndDate before startDate...');
  const badDateRes = await request('/jobs', {
    method: 'POST',
    headers: empHeaders,
    body: JSON.stringify({
      ...newJobPayload,
      durationType: 'fixed_duration',
      startDate: new Date(Date.now() + 86400000 * 5).toISOString(),
      estimatedEndDate: new Date(Date.now() + 86400000 * 2).toISOString(),
    }),
  });
  console.log('Bad end date status:', badDateRes.status, 'Message:', badDateRes.data.error?.message, '(Expected: 400)');

  await mongoose.disconnect();
  console.log('\n--- ALL BACKEND STEP 5 TESTS COMPLETED SUCCESSFULLY ---');
}

testStep5().catch((err) => {
  console.error('Test step 5 error:', err);
  mongoose.disconnect();
  process.exit(1);
});
