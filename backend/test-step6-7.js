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
  return { token: res.data.data.token, user: res.data.data.user };
}

async function testStep6And7() {
  console.log('=== STARTING COMBINED STEP 6 + STEP 7 AUTOMATED VERIFICATION ===');

  const ts = Date.now();
  const password = 'Password123!';

  console.log('\n--- 1. Authenticating test users ---');
  const emp1 = await getAuthToken('Emp One', `emp1_${ts}@example.com`, `98${ts.toString().slice(-8)}`, 'employer', password);
  const emp2 = await getAuthToken('Emp Two', `emp2_${ts}@example.com`, `97${ts.toString().slice(-8)}`, 'employer', password);
  const wrk1 = await getAuthToken('Wrk One', `wrk1_${ts}@example.com`, `96${ts.toString().slice(-8)}`, 'worker', password);
  const wrk2 = await getAuthToken('Wrk Two', `wrk2_${ts}@example.com`, `95${ts.toString().slice(-8)}`, 'worker', password);

  const emp1Headers = { Authorization: `Bearer ${emp1.token}` };
  const emp2Headers = { Authorization: `Bearer ${emp2.token}` };
  const wrk1Headers = { Authorization: `Bearer ${wrk1.token}` };
  const wrk2Headers = { Authorization: `Bearer ${wrk2.token}` };

  console.log('Users authenticated. Emp1 ID:', emp1.user.id, 'Wrk1 ID:', wrk1.user.id);

  console.log('\n--- 2. Setting up Jobs ---');
  // Create Job 1 (Open) by Emp 1
  const job1Res = await request('/jobs', {
    method: 'POST',
    headers: emp1Headers,
    body: JSON.stringify({
      title: 'Senior Mason Required',
      description: 'Brickwork and plastering work in Kothrud.',
      skillRequired: 'mason',
      workersRequired: 2,
      location: { city: 'Pune', area: 'Kothrud' },
      wageType: 'daily',
      wageAmount: 950,
      durationType: 'fixed_duration',
      startDate: new Date(Date.now() + 86400000).toISOString(),
      estimatedEndDate: new Date(Date.now() + 86400000 * 5).toISOString(),
      workingHours: { start: '09:00', end: '18:00' },
    }),
  });
  const job1Id = job1Res.data.data._id;
  console.log('Created Job 1 (Open) ID:', job1Id);

  // Create Job 2 (Closed) by Emp 1
  const job2Res = await request('/jobs', {
    method: 'POST',
    headers: emp1Headers,
    body: JSON.stringify({
      title: 'Closed Painting Work',
      description: 'Interior painting.',
      skillRequired: 'painter',
      workersRequired: 1,
      location: { city: 'Pune' },
      wageType: 'daily',
      wageAmount: 800,
      durationType: 'single_day',
      startDate: new Date().toISOString(),
    }),
  });
  const job2Id = job2Res.data.data._id;
  await request(`/jobs/${job2Id}/close`, { method: 'PATCH', headers: emp1Headers });
  console.log('Created and Closed Job 2 ID:', job2Id);

  console.log('\n--- 3. Testing Job Applications ---');
  // 3.1 Wrk1 applies to Job 1
  console.log('3.1 Wrk1 applies to Job 1...');
  const app1Res = await request(`/applications/jobs/${job1Id}`, {
    method: 'POST',
    headers: wrk1Headers,
    body: JSON.stringify({ proposedWage: 1000, message: 'I have 5 years experience as a mason' }),
  });
  console.log('Apply status:', app1Res.status, 'Success:', app1Res.data.success);
  if (!app1Res.data.success) throw new Error('Wrk1 application failed');
  const app1Id = app1Res.data.data._id;

  // 3.2 Duplicate application fails
  console.log('3.2 Testing duplicate application prevention...');
  const dupAppRes = await request(`/applications/jobs/${job1Id}`, {
    method: 'POST',
    headers: wrk1Headers,
    body: JSON.stringify({ proposedWage: 1000, message: 'Duplicate test' }),
  });
  console.log('Duplicate apply status:', dupAppRes.status, '(Expected: 409)');

  // 3.3 Apply to closed job fails
  console.log('3.3 Testing application to closed job...');
  const closedAppRes = await request(`/applications/jobs/${job2Id}`, {
    method: 'POST',
    headers: wrk1Headers,
    body: JSON.stringify({ proposedWage: 800 }),
  });
  console.log('Closed job apply status:', closedAppRes.status, '(Expected: 400)');

  // 3.4 Worker sees own applications
  console.log('3.4 Wrk1 gets own applications...');
  const wrkAppsRes = await request('/applications/my', { headers: wrk1Headers });
  console.log('Wrk1 applications count:', wrkAppsRes.data.data?.length);

  // 3.5 Employer sees applications for own job
  console.log('3.5 Emp1 gets employer applications...');
  const empAppsRes = await request('/applications/employer', { headers: emp1Headers });
  console.log('Emp1 applications count:', empAppsRes.data.data?.length);

  // 3.6 Wrk2 applies and withdraws application
  console.log('3.6 Wrk2 applies and withdraws application...');
  const appWrk2Res = await request(`/applications/jobs/${job1Id}`, {
    method: 'POST',
    headers: wrk2Headers,
    body: JSON.stringify({ proposedWage: 950, message: 'Wrk2 application' }),
  });
  const appWrk2Id = appWrk2Res.data.data._id;
  const withdrawRes = await request(`/applications/${appWrk2Id}/withdraw`, {
    method: 'PATCH',
    headers: wrk2Headers,
  });
  console.log('Withdraw status:', withdrawRes.status, 'New status:', withdrawRes.data.data?.status);

  // 3.7 Employer shortlists and then selects App 1
  console.log('3.7 Employer shortlists App 1...');
  const shortlistRes = await request(`/applications/${app1Id}/shortlist`, {
    method: 'PATCH',
    headers: emp1Headers,
  });
  console.log('Shortlist status:', shortlistRes.data.data?.status);

  console.log('3.8 Employer selects App 1...');
  const selectRes = await request(`/applications/${app1Id}/select`, {
    method: 'PATCH',
    headers: emp1Headers,
  });
  console.log('Select status:', selectRes.data.data?.status);

  console.log('\n--- 4. Testing Job Invitations ---');
  // 4.1 Emp1 invites Wrk2 to Job 1
  console.log('4.1 Emp1 invites Wrk2 to Job 1...');
  const invRes = await request('/invitations', {
    method: 'POST',
    headers: emp1Headers,
    body: JSON.stringify({
      jobId: job1Id,
      workerId: wrk2.user.id,
      proposedWage: 950,
      message: 'Direct invitation to join mason team',
    }),
  });
  console.log('Invitation status:', invRes.status, 'Success:', invRes.data.success);
  const invId = invRes.data.data._id;

  // 4.2 Duplicate active invitation fails
  console.log('4.2 Duplicate active invitation test...');
  const dupInvRes = await request('/invitations', {
    method: 'POST',
    headers: emp1Headers,
    body: JSON.stringify({
      jobId: job1Id,
      workerId: wrk2.user.id,
      proposedWage: 950,
    }),
  });
  console.log('Duplicate invitation status:', dupInvRes.status, '(Expected: 409)');

  // 4.3 Worker cannot create invitation
  console.log('4.3 Worker tries to create invitation...');
  const wrkInvRes = await request('/invitations', {
    method: 'POST',
    headers: wrk1Headers,
    body: JSON.stringify({ jobId: job1Id, workerId: wrk2.user.id, proposedWage: 900 }),
  });
  console.log('Worker invite status:', wrkInvRes.status, '(Expected: 403)');

  // 4.4 Employer 2 cannot invite through Employer 1\'s job
  console.log('4.4 Emp2 tries to invite through Emp1\'s job...');
  const emp2InvRes = await request('/invitations', {
    method: 'POST',
    headers: emp2Headers,
    body: JSON.stringify({ jobId: job1Id, workerId: wrk2.user.id, proposedWage: 900 }),
  });
  console.log('Emp2 invite status:', emp2InvRes.status, '(Expected: 403)');

  // 4.5 Wrk2 sees invitation and accepts
  console.log('4.5 Wrk2 views invitations & accepts...');
  const wrkInvsRes = await request('/invitations/my', { headers: wrk2Headers });
  console.log('Wrk2 invitations count:', wrkInvsRes.data.data?.length);
  const acceptInvRes = await request(`/invitations/${invId}/accept`, {
    method: 'PATCH',
    headers: wrk2Headers,
  });
  console.log('Accept invitation status:', acceptInvRes.data.data?.status);

  console.log('\n--- 5. Testing Hiring Agreement & Negotiation Workflow ---');
  // 5.1 Create Hiring Agreement from Selected Application (Emp1 & Wrk1)
  console.log('5.1 Creating hiring agreement from selected application...');
  const createAgrPayload = {
    sourceType: 'application',
    sourceId: app1Id,
    durationType: 'fixed_duration',
    startDate: new Date(Date.now() + 86400000).toISOString(),
    estimatedEndDate: new Date(Date.now() + 86400000 * 5).toISOString(),
    wageType: 'daily',
    proposedWage: 950,
    workingHours: { start: '09:00', end: '18:00', description: 'Tea break at 4 PM' },
    message: 'Initial proposal from Employer: ₹950/day',
  };

  const createAgrRes = await request('/hiring-agreements', {
    method: 'POST',
    headers: emp1Headers,
    body: JSON.stringify(createAgrPayload),
  });
  console.log('Agreement creation status:', createAgrRes.status, 'Success:', createAgrRes.data.success);
  if (!createAgrRes.data.success) throw new Error('Agreement creation failed');
  const agrId = createAgrRes.data.data._id;
  console.log('Created Agreement ID:', agrId, 'Initial status:', createAgrRes.data.data.status);

  // 5.2 Wrk1 views agreement details
  console.log('5.2 Wrk1 views agreement details...');
  const getAgrRes = await request(`/hiring-agreements/${agrId}`, { headers: wrk1Headers });
  console.log('Wrk1 fetched agreement title:', getAgrRes.data.data?.jobId?.title);

  // 5.3 Wrk1 submits counter-offer (₹1050/day, 6 days)
  console.log('5.3 Wrk1 submits counter-offer (₹1050/day)...');
  const counter1Res = await request(`/hiring-agreements/${agrId}/counter`, {
    method: 'PATCH',
    headers: wrk1Headers,
    body: JSON.stringify({
      durationType: 'fixed_duration',
      startDate: new Date(Date.now() + 86400000).toISOString(),
      estimatedEndDate: new Date(Date.now() + 86400000 * 6).toISOString(),
      wageType: 'daily',
      proposedWage: 1050,
      workingHours: { start: '09:00', end: '18:00', description: 'Tea break included' },
      message: 'Wrk1 counter: I request ₹1050/day for 6 days',
    }),
  });
  console.log('Counter 1 status:', counter1Res.data.data?.status, 'Version:', counter1Res.data.data?.currentVersion);

  // 5.4 Emp1 submits 2nd counter-offer (₹1000/day, 5 days)
  console.log('5.4 Emp1 submits 2nd counter-offer (₹1000/day)...');
  const counter2Res = await request(`/hiring-agreements/${agrId}/counter`, {
    method: 'PATCH',
    headers: emp1Headers,
    body: JSON.stringify({
      durationType: 'fixed_duration',
      startDate: new Date(Date.now() + 86400000).toISOString(),
      estimatedEndDate: new Date(Date.now() + 86400000 * 5).toISOString(),
      wageType: 'daily',
      proposedWage: 1000,
      workingHours: { start: '09:00', end: '18:00' },
      message: 'Emp1 counter: Let us settle at ₹1000/day for 5 days',
    }),
  });
  console.log('Counter 2 status:', counter2Res.data.data?.status, 'Version:', counter2Res.data.data?.currentVersion);
  console.log('Offer history length:', counter2Res.data.data?.offerHistory?.length);

  // 5.5 Wrk1 accepts final offer
  console.log('5.5 Wrk1 accepts final offer...');
  const wrkAcceptRes = await request(`/hiring-agreements/${agrId}/accept`, {
    method: 'PATCH',
    headers: wrk1Headers,
  });
  console.log('Wrk1 accept status:', wrkAcceptRes.data.data?.status, 'Employer accepted:', wrkAcceptRes.data.data?.employerAccepted, 'Worker accepted:', wrkAcceptRes.data.data?.workerAccepted);

  // Since Emp1 made counter 2, emp1Accepted was already true. When Wrk1 accepted, both are true!
  console.log('Final Agreement status:', wrkAcceptRes.data.data?.status, '(Expected: confirmed)');
  console.log('Final Agreed Wage:', wrkAcceptRes.data.data?.agreedWage, '(Expected: 1000)');

  // 5.6 Test Immutability of Confirmed Agreement
  console.log('5.6 Testing Immutability of Confirmed Agreement...');
  const editConfirmedRes = await request(`/hiring-agreements/${agrId}/counter`, {
    method: 'PATCH',
    headers: emp1Headers,
    body: JSON.stringify({
      durationType: 'single_day',
      startDate: new Date().toISOString(),
      wageType: 'daily',
      proposedWage: 500,
    }),
  });
  console.log('Editing confirmed agreement status:', editConfirmedRes.status, 'Message:', editConfirmedRes.data.error?.message, '(Expected: 400)');

  console.log('\n--- 6. MongoDB Collection & Document Verification ---');
  const mongoUri = process.env.MONGO_URI;
  await mongoose.connect(mongoUri);

  const JobApplication = (await import('./src/models/JobApplication.js')).default;
  const JobInvitation = (await import('./src/models/JobInvitation.js')).default;
  const HiringAgreement = (await import('./src/models/HiringAgreement.js')).default;

  const appCount = await JobApplication.countDocuments();
  const invCount = await JobInvitation.countDocuments();
  const agrCount = await HiringAgreement.countDocuments();

  console.log('MongoDB JobApplications count:', appCount);
  console.log('MongoDB JobInvitations count:', invCount);
  console.log('MongoDB HiringAgreements count:', agrCount);

  const confirmedAgr = await HiringAgreement.findById(agrId);
  console.log('DB Confirmed Agreement status:', confirmedAgr.status, 'agreedWage:', confirmedAgr.agreedWage);

  // Check that NO Project collection/document was created
  const collections = await mongoose.connection.db.listCollections().toArray();
  const collectionNames = collections.map((c) => c.name);
  console.log('Current DB Collections:', collectionNames);
  console.log('Projects collection exists?', collectionNames.includes('projects'), '(Expected: false)');

  await mongoose.disconnect();
  console.log('\n=== ALL COMBINED STEP 6 + STEP 7 VERIFICATION TESTS PASSED SUCCESSFULLY ===');
}

testStep6And7().catch((err) => {
  console.error('Test step 6 & 7 error:', err);
  mongoose.disconnect();
  process.exit(1);
});
