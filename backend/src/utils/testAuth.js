import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import { connectDB } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function runAuthTests() {
  const baseURL = 'http://localhost:5000/api/auth';

  try {
    await connectDB();
    await User.deleteMany({ email: { $in: ['worker_step3@example.com', 'employer_step3@example.com'] } });
  } catch (_e) {}

  console.log('=== TEST 1: Register Worker ===');
  const resRegWorker = await fetch(`${baseURL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Worker Step3',
      email: 'worker_step3@example.com',
      phone: '9991112222',
      password: 'StrongPassword123',
      role: 'worker',
      preferredLanguage: 'mr',
    }),
  });
  const dataRegWorker = await resRegWorker.json();
  console.log('Status:', resRegWorker.status, JSON.stringify(dataRegWorker, null, 2));

  console.log('\n=== TEST 2: Register Employer ===');
  const resRegEmp = await fetch(`${baseURL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Employer Step3',
      email: 'employer_step3@example.com',
      phone: '8881112222',
      password: 'StrongPassword123',
      role: 'employer',
      preferredLanguage: 'en',
    }),
  });
  const dataRegEmp = await resRegEmp.json();
  console.log('Status:', resRegEmp.status, JSON.stringify(dataRegEmp, null, 2));

  console.log('\n=== TEST 3: Try Public Admin Registration ===');
  const resRegAdmin = await fetch(`${baseURL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Fake Admin',
      email: 'fakeadmin@example.com',
      password: 'StrongPassword123',
      role: 'admin',
    }),
  });
  const dataRegAdmin = await resRegAdmin.json();
  console.log('Status:', resRegAdmin.status, JSON.stringify(dataRegAdmin, null, 2));

  console.log('\n=== TEST 4: Try Employer with Marathi Language ===');
  const resEmpMr = await fetch(`${baseURL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Employer Marathi',
      email: 'emp_mr@example.com',
      password: 'StrongPassword123',
      role: 'employer',
      preferredLanguage: 'mr',
    }),
  });
  const dataEmpMr = await resEmpMr.json();
  console.log('Status:', resEmpMr.status, JSON.stringify(dataEmpMr, null, 2));

  console.log('\n=== TEST 5: Login as Worker ===');
  const resLoginWorker = await fetch(`${baseURL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'worker_step3@example.com',
      password: 'StrongPassword123',
    }),
  });
  const dataLoginWorker = await resLoginWorker.json();
  const cookies = resLoginWorker.headers.get('set-cookie');
  const workerToken = dataLoginWorker.data?.token;
  console.log('Status:', resLoginWorker.status, 'Cookie Set:', !!cookies, JSON.stringify(dataLoginWorker, null, 2));

  console.log('\n=== TEST 6: GET /api/auth/me (Authenticated Worker) ===');
  const resMe = await fetch(`${baseURL}/me`, {
    headers: { Authorization: `Bearer ${workerToken}` },
  });
  const dataMe = await resMe.json();
  console.log('Status:', resMe.status, JSON.stringify(dataMe, null, 2));

  console.log('\n=== TEST 7: GET /api/auth/test (Dev Test Endpoint) ===');
  const resTest = await fetch(`${baseURL}/test`, {
    headers: { Authorization: `Bearer ${workerToken}` },
  });
  const dataTest = await resTest.json();
  console.log('Status:', resTest.status, JSON.stringify(dataTest, null, 2));

  console.log('\n=== TEST 8: Role Restriction (Worker accessing Employer route) ===');
  const resEmpOnly = await fetch(`${baseURL}/employer-only`, {
    headers: { Authorization: `Bearer ${workerToken}` },
  });
  const dataEmpOnly = await resEmpOnly.json();
  console.log('Status:', resEmpOnly.status, JSON.stringify(dataEmpOnly, null, 2));

  console.log('\n=== TEST 9: Role Restriction (Worker accessing Admin route) ===');
  const resAdminOnly = await fetch(`${baseURL}/admin-only`, {
    headers: { Authorization: `Bearer ${workerToken}` },
  });
  const dataAdminOnly = await resAdminOnly.json();
  console.log('Status:', resAdminOnly.status, JSON.stringify(dataAdminOnly, null, 2));

  console.log('\n=== TEST 10: Incorrect Password ===');
  const resWrongPass = await fetch(`${baseURL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'worker_step3@example.com',
      password: 'WrongPassword999',
    }),
  });
  const dataWrongPass = await resWrongPass.json();
  console.log('Status:', resWrongPass.status, JSON.stringify(dataWrongPass, null, 2));

  console.log('\n=== TEST 11: Unauthenticated Request to Protected Route ===');
  const resUnauth = await fetch(`${baseURL}/me`);
  const dataUnauth = await resUnauth.json();
  console.log('Status:', resUnauth.status, JSON.stringify(dataUnauth, null, 2));

  console.log('\n=== TEST 12: Logout ===');
  const resLogout = await fetch(`${baseURL}/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${workerToken}` },
  });
  const dataLogout = await resLogout.json();
  console.log('Status:', resLogout.status, JSON.stringify(dataLogout, null, 2));

  // Test suspension & inspect passwordHash directly via User model
  try {
    const dbWorker = await User.findOne({ email: 'worker_step3@example.com' }).select('+passwordHash');
    console.log('\n=== DB INSPECTION (worker_step3@example.com) ===');
    console.log('Plain password in DB?:', 'password' in (dbWorker ? (dbWorker.toObject ? dbWorker.toObject() : dbWorker) : {}));
    console.log('passwordHash exists?:', !!dbWorker?.passwordHash);
    console.log('passwordHash starts with $2a$ or $2b$?:', dbWorker?.passwordHash?.startsWith('$2'));
    console.log('Role:', dbWorker?.role);
    console.log('Preferred Language:', dbWorker?.preferredLanguage);

    console.log('\n=== TEST 13: Suspended User Login ===');
    await User.updateOne({ email: 'worker_step3@example.com' }, { $set: { status: 'suspended' } });

    const resSuspendedLogin = await fetch(`${baseURL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'worker_step3@example.com',
        password: 'StrongPassword123',
      }),
    });
    const dataSuspendedLogin = await resSuspendedLogin.json();
    console.log('Status:', resSuspendedLogin.status, JSON.stringify(dataSuspendedLogin, null, 2));

    // Restore active status
    await User.updateOne({ email: 'worker_step3@example.com' }, { $set: { status: 'active' } });
  } catch (_e) {}
}

runAuthTests().catch(console.error);
