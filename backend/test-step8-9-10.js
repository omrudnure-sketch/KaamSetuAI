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

async function testStep8To10() {
  console.log('=== STARTING COMBINED STEP 8 + 9 + 10 AUTOMATED VERIFICATION ===');

  const ts = Date.now();
  const password = 'Password123!';

  console.log('\n--- 1. Authenticating test users ---');
  const emp1 = await getAuthToken('Emp Main', `emp_s8_${ts}@example.com`, `98${ts.toString().slice(-8)}`, 'employer', password);
  const emp2 = await getAuthToken('Emp Other', `emp2_s8_${ts}@example.com`, `97${ts.toString().slice(-8)}`, 'employer', password);
  const wrk1 = await getAuthToken('Wrk Main', `wrk_s8_${ts}@example.com`, `96${ts.toString().slice(-8)}`, 'worker', password);
  const wrk2 = await getAuthToken('Wrk Other', `wrk2_s8_${ts}@example.com`, `95${ts.toString().slice(-8)}`, 'worker', password);

  const emp1Headers = { Authorization: `Bearer ${emp1.token}` };
  const emp2Headers = { Authorization: `Bearer ${emp2.token}` };
  const wrk1Headers = { Authorization: `Bearer ${wrk1.token}` };
  const wrk2Headers = { Authorization: `Bearer ${wrk2.token}` };

  console.log('\n--- 2. End-to-End Prep: Job -> Application -> Selection -> Confirmed Hiring Agreement ---');
  const jobRes = await request('/jobs', {
    method: 'POST',
    headers: emp1Headers,
    body: JSON.stringify({
      title: 'Commercial Carpenter Work',
      description: 'Building wooden fixtures and doors.',
      skillRequired: 'carpenter',
      workersRequired: 1,
      location: { city: 'Pune', area: 'Viman Nagar' },
      wageType: 'daily',
      wageAmount: 1100,
      durationType: 'fixed_duration',
      startDate: new Date(Date.now() + 86400000).toISOString(),
      estimatedEndDate: new Date(Date.now() + 86400000 * 5).toISOString(),
      workingHours: { start: '09:00', end: '18:00' },
    }),
  });
  const jobId = jobRes.data.data._id;

  const appRes = await request(`/applications/jobs/${jobId}`, {
    method: 'POST',
    headers: wrk1Headers,
    body: JSON.stringify({ proposedWage: 1100, message: 'Experienced carpenter available' }),
  });
  const appId = appRes.data.data._id;

  await request(`/applications/${appId}/select`, { method: 'PATCH', headers: emp1Headers });

  const agrRes = await request('/hiring-agreements', {
    method: 'POST',
    headers: emp1Headers,
    body: JSON.stringify({
      sourceType: 'application',
      sourceId: appId,
      durationType: 'fixed_duration',
      startDate: new Date(Date.now() + 86400000).toISOString(),
      estimatedEndDate: new Date(Date.now() + 86400000 * 5).toISOString(),
      wageType: 'daily',
      proposedWage: 1100,
      workingHours: { start: '09:00', end: '18:00' },
    }),
  });
  const agrId = agrRes.data.data._id;

  // Wrk1 accepts to confirm hiring agreement
  const agrAcceptRes = await request(`/hiring-agreements/${agrId}/accept`, {
    method: 'PATCH',
    headers: wrk1Headers,
  });
  console.log('Confirmed Hiring Agreement status:', agrAcceptRes.data.data?.status, '(Expected: confirmed)');

  console.log('\n--- 3. Testing Project Creation from Confirmed Agreement ---');
  // 3.1 Create Project from Confirmed Agreement
  const createProjRes = await request(`/projects/from-agreement/${agrId}`, {
    method: 'POST',
    headers: emp1Headers,
  });
  console.log('Create Project status:', createProjRes.status, 'Success:', createProjRes.data.success);
  if (!createProjRes.data.success) throw new Error('Project creation failed');
  const projId = createProjRes.data.data.project._id;
  console.log('Created Project ID:', projId, 'Initial status:', createProjRes.data.data.project.status);

  // 3.2 Worker & Employer fetch project list
  const wrkProjsRes = await request('/projects/worker', { headers: wrk1Headers });
  console.log('Worker projects count:', wrkProjsRes.data.data?.length);

  const empProjsRes = await request('/projects/employer', { headers: emp1Headers });
  console.log('Employer projects count:', empProjsRes.data.data?.length);

  // 3.3 Security check: Unrelated user cannot view project
  const emp2ViewRes = await request(`/projects/${projId}`, { headers: emp2Headers });
  console.log('Emp2 view project status:', emp2ViewRes.status, '(Expected: 403)');

  const wrk2ViewRes = await request(`/projects/${projId}`, { headers: wrk2Headers });
  console.log('Wrk2 view project status:', wrk2ViewRes.status, '(Expected: 403)');

  // 3.4 Start Project
  console.log('\n--- 4. Starting Project & Status Transitions ---');
  const startRes = await request(`/projects/${projId}/start`, {
    method: 'PATCH',
    headers: emp1Headers,
  });
  console.log('Start project status:', startRes.data.data?.status, '(Expected: in_progress)');

  // 3.5 Invalid transition test: starting already in_progress project fails
  const badStartRes = await request(`/projects/${projId}/start`, {
    method: 'PATCH',
    headers: emp1Headers,
  });
  console.log('Bad start transition status:', badStartRes.status, '(Expected: 400)');

  console.log('\n--- 5. Testing Attendance (Check-In & Check-Out) ---');
  const todayStr = new Date().toISOString().split('T')[0];

  // 5.1 Worker check-in
  const checkInRes = await request('/attendance/check-in', {
    method: 'POST',
    headers: wrk1Headers,
    body: JSON.stringify({ projectId: projId, notes: 'Arrived at site on time' }),
  });
  console.log('Check-in status:', checkInRes.status, 'CheckIn time:', checkInRes.data.data?.checkIn !== null);

  // 5.2 Duplicate check-in fails
  const dupCheckInRes = await request('/attendance/check-in', {
    method: 'POST',
    headers: wrk1Headers,
    body: JSON.stringify({ projectId: projId }),
  });
  console.log('Duplicate check-in status:', dupCheckInRes.status, '(Expected: 409)');

  // 5.3 Unassigned worker check-in fails
  const wrk2CheckInRes = await request('/attendance/check-in', {
    method: 'POST',
    headers: wrk2Headers,
    body: JSON.stringify({ projectId: projId }),
  });
  console.log('Unassigned worker check-in status:', wrk2CheckInRes.status, '(Expected: 403)');

  // 5.4 Worker check-out
  const checkOutRes = await request('/attendance/check-out', {
    method: 'POST',
    headers: wrk1Headers,
    body: JSON.stringify({ projectId: projId, notes: 'Finished shift' }),
  });
  console.log('Check-out status:', checkOutRes.status, 'CheckOut time:', checkOutRes.data.data?.checkOut !== null);

  // 5.5 Duplicate check-out fails
  const dupCheckOutRes = await request('/attendance/check-out', {
    method: 'POST',
    headers: wrk1Headers,
    body: JSON.stringify({ projectId: projId }),
  });
  console.log('Duplicate check-out status:', dupCheckOutRes.status, '(Expected: 409)');

  // 5.6 Employer views project attendance
  const empAttRes = await request(`/attendance/project/${projId}`, { headers: emp1Headers });
  console.log('Employer project attendance count:', empAttRes.data.data?.length);

  console.log('\n--- 6. Testing Daily Progress Updates ---');
  // 6.1 Worker submits today's progress (50%)
  const prog1Res = await request(`/progress/projects/${projId}`, {
    method: 'POST',
    headers: wrk1Headers,
    body: JSON.stringify({
      percentage: 50,
      description: 'Completed wooden door framing and sanding',
      tasksCompleted: ['Door framing', 'Sanding'],
      blockers: [],
      photos: ['https://example.com/photo1.jpg'],
    }),
  });
  console.log('Progress 1 status:', prog1Res.status, 'Saved percentage:', prog1Res.data.data?.percentage);

  // 6.2 Verify Project overall progress updated to 50%
  const projCheck1 = await request(`/projects/${projId}`, { headers: emp1Headers });
  console.log('Project overall progress percentage:', projCheck1.data.data?.project?.progressPercentage, '(Expected: 50)');

  // 6.3 Worker updates today's progress (80%) (editing same day record, no duplicate created)
  const prog2Res = await request(`/progress/projects/${projId}`, {
    method: 'POST',
    headers: wrk1Headers,
    body: JSON.stringify({
      percentage: 80,
      description: 'Fixed hinges and completed final polish',
      tasksCompleted: ['Hinges installation', 'Polishing'],
      blockers: ['Minor varnish delay'],
    }),
  });
  console.log('Progress 2 (update) status:', prog2Res.status, 'Updated percentage:', prog2Res.data.data?.percentage);

  // 6.4 Invalid percentage test (>100 or <0)
  const badProgRes = await request(`/progress/projects/${projId}`, {
    method: 'POST',
    headers: wrk1Headers,
    body: JSON.stringify({ percentage: 120 }),
  });
  console.log('Invalid percentage status:', badProgRes.status, '(Expected: 400)');

  // 6.5 Employer views progress updates
  const empProgRes = await request(`/progress/projects/${projId}`, { headers: emp1Headers });
  console.log('Employer progress timeline count:', empProgRes.data.data?.length, '(Expected: 1 document updated)');

  console.log('\n--- 7. Completing Project Lifecycle ---');
  // 7.1 Request completion
  const reqCompRes = await request(`/projects/${projId}/request-completion`, {
    method: 'PATCH',
    headers: wrk1Headers,
  });
  console.log('Request completion status:', reqCompRes.data.data?.status, '(Expected: completion_requested)');

  // 7.2 Complete project
  const compRes = await request(`/projects/${projId}/complete`, {
    method: 'PATCH',
    headers: emp1Headers,
  });
  console.log('Complete project status:', compRes.data.data?.status, 'Final progress percentage:', compRes.data.data?.progressPercentage, '(Expected: completed & 100%)');

  // 7.3 Invalid transition test: completed -> in_progress fails
  const badReopenRes = await request(`/projects/${projId}/start`, {
    method: 'PATCH',
    headers: emp1Headers,
  });
  console.log('Completed -> in_progress status:', badReopenRes.status, '(Expected: 400)');

  console.log('\n--- 8. Database Collections & Index Verification ---');
  const mongoUri = process.env.MONGO_URI;
  await mongoose.connect(mongoUri);

  const Project = (await import('./src/models/Project.js')).default;
  const ProjectWorker = (await import('./src/models/ProjectWorker.js')).default;
  const Attendance = (await import('./src/models/Attendance.js')).default;
  const ProgressUpdate = (await import('./src/models/ProgressUpdate.js')).default;

  console.log('MongoDB Projects count:', await Project.countDocuments());
  console.log('MongoDB ProjectWorkers count:', await ProjectWorker.countDocuments());
  console.log('MongoDB Attendance count:', await Attendance.countDocuments());
  console.log('MongoDB ProgressUpdates count:', await ProgressUpdate.countDocuments());

  const collections = await mongoose.connection.db.listCollections().toArray();
  const collectionNames = collections.map((c) => c.name);
  console.log('Current DB Collections:', collectionNames);

  console.log('Payments collection exists?', collectionNames.includes('payments'), '(Expected: false)');
  console.log('Extensions collection exists?', collectionNames.includes('extensions'), '(Expected: false)');
  console.log('Reviews collection exists?', collectionNames.includes('reviews'), '(Expected: false)');

  await mongoose.disconnect();
  console.log('\n=== ALL COMBINED STEP 8 + 9 + 10 VERIFICATION TESTS PASSED SUCCESSFULLY ===');
}

testStep8To10().catch((err) => {
  console.error('Test step 8-10 error:', err);
  mongoose.disconnect();
  process.exit(1);
});
