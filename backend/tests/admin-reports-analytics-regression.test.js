// KaamSetu AI — Regression Test Suite for Admin Reports, Analytics & UUID Validation
// Verifies fix for:
// 1. Admin Reports: queryBuilder.getFilter error & column mappings
// 2. Admin Analytics: skill.trim crash in skillAnalytics & date range filtering
// 3. UUID compatibility across attendance, invitation, application, and hiring validators

import assert from 'assert';
import crypto from 'crypto';
import { connectDB } from '../src/config/db.js';
import { getOverviewAnalytics } from '../src/analytics/overviewAnalytics.js';
import { getUserAnalytics } from '../src/analytics/userAnalytics.js';
import { getHiringAnalytics } from '../src/analytics/hiringAnalytics.js';
import { getProjectAnalytics } from '../src/analytics/projectAnalytics.js';
import { getAttendanceAnalytics } from '../src/analytics/attendanceAnalytics.js';
import { getPaymentAnalytics } from '../src/analytics/paymentAnalytics.js';
import { getSkillAnalytics } from '../src/analytics/skillAnalytics.js';
import { getLocationAnalytics } from '../src/analytics/locationAnalytics.js';
import { generateReportData, convertToCSV, sanitizeForCSV } from '../src/services/reportService.js';
import { validateCheckIn, validateCheckOut } from '../src/validators/attendanceValidator.js';
import { validateCreateInvitation } from '../src/validators/invitationValidator.js';
import { validateCreateApplication } from '../src/validators/applicationValidator.js';
import { validateCreateHiringAgreement } from '../src/validators/hiringValidator.js';
import { Job } from '../src/models/index.js';
import { parseDateRange } from '../src/utils/dateFilter.js';

console.log('======================================================');
console.log('RUNNING SUITE: Admin Reports, Analytics & UUID Regression');
console.log('======================================================');

let passed = 0;
const test = (desc, fn) => {
  try {
    fn();
    console.log(`  ✓ [PASS] ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${desc}: ${err.message}`);
    throw err;
  }
};

const asyncTest = async (desc, fn) => {
  try {
    await fn();
    console.log(`  ✓ [PASS] ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${desc}: ${err.message}`);
    throw err;
  }
};

await connectDB();

// --- 1. UUID Validation in Validators ---
console.log('\n--- 1. UUID & ID Format Validation ---');

test('Attendance validateCheckIn accepts valid UUID for projectId', () => {
  const uuid = crypto.randomUUID();
  const res = validateCheckIn({ projectId: uuid, notes: 'Morning check in' });
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.data.projectId, uuid);
});

test('Attendance validateCheckOut accepts valid UUID for projectId', () => {
  const uuid = crypto.randomUUID();
  const res = validateCheckOut({ projectId: uuid, notes: 'Evening check out' });
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.data.projectId, uuid);
});

test('Attendance validateCheckIn rejects malformed non-ID string', () => {
  const res = validateCheckIn({ projectId: 'invalid_not_an_id', notes: 'test' });
  assert.strictEqual(res.isValid, false);
  assert.ok(res.error.includes('Invalid Project ID format'));
});

test('Invitation validateCreateInvitation accepts valid UUIDs for jobId and workerId', () => {
  const jobId = crypto.randomUUID();
  const workerId = crypto.randomUUID();
  const res = validateCreateInvitation({
    jobId,
    workerId,
    proposedWage: 750,
    message: 'We invite you for this job',
  });
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.data.jobId, jobId);
  assert.strictEqual(res.data.workerId, workerId);
});

test('Application validateCreateApplication accepts valid UUID for jobId', () => {
  const jobId = crypto.randomUUID();
  const res = validateCreateApplication({
    jobId,
    proposedWage: 600,
    message: 'Experienced plumber applying',
  });
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.data.jobId, jobId);
});

test('Hiring agreement validateCreateHiringAgreement accepts valid UUID for sourceId', () => {
  const sourceId = crypto.randomUUID();
  const res = validateCreateHiringAgreement({
    sourceType: 'application',
    sourceId,
    durationType: 'single_day',
    startDate: '2026-10-15',
    wageType: 'daily',
    proposedWage: 800,
  });
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.data.sourceId, sourceId);
});

// --- 2. Admin Analytics Endpoints ---
console.log('\n--- 2. Admin Analytics Execution ---');

await asyncTest('getSkillAnalytics executes without crash and returns skills list', async () => {
  const res = await getSkillAnalytics({ dateRange: '30d' });
  assert.ok(res, 'Should return analytics result');
  assert.ok(Array.isArray(res.skills), 'Should contain skills array');
  assert.ok(res.definitions, 'Should contain metric definitions');
  if (res.skills.length > 0) {
    const s = res.skills[0];
    assert.ok(typeof s.skill === 'string', 'Skill should have a string name');
    assert.ok(typeof s.openJobs === 'number', 'openJobs should be a number');
    assert.ok(typeof s.availableWorkers === 'number', 'availableWorkers should be a number');
    assert.ok(typeof s.gap === 'number', 'gap should be a number');
  }
});

await asyncTest('All 8 analytics modules execute and return valid telemetry', async () => {
  const [overview, users, hiring, projects, attendance, payments, skills, locations] = await Promise.all([
    getOverviewAnalytics({}),
    getUserAnalytics({}),
    getHiringAnalytics({}),
    getProjectAnalytics({}),
    getAttendanceAnalytics({}),
    getPaymentAnalytics({}),
    getSkillAnalytics({}),
    getLocationAnalytics({}),
  ]);
  assert.ok(overview && overview.metrics, 'overview should have metrics');
  assert.ok(users && users.totals, 'users should have totals');
  assert.ok(hiring && hiring.funnel, 'hiring should have funnel');
  assert.ok(projects && projects.statusDistribution, 'projects should have status distribution');
  assert.ok(attendance && attendance.records !== undefined, 'attendance should have records');
  assert.ok(payments && payments.totals, 'payments should have totals');
  assert.ok(skills && skills.skills, 'skills should have skills array');
  assert.ok(locations && locations.locations, 'locations should have locations array');
});

// --- 3. Admin Reports Categories ---
console.log('\n--- 3. Admin Reports Generation & CSV Serialization ---');

const categories = [
  'workers',
  'employers',
  'jobs',
  'applications',
  'agreements',
  'projects',
  'attendance',
  'payments',
  'reviews',
  'complaints',
  'disputes',
  'skills',
  'locations',
];

for (const cat of categories) {
  await asyncTest(`generateReportData('${cat}') returns valid headers, pagination, and data array`, async () => {
    const res = await generateReportData(cat, { limit: 10, page: 1 });
    assert.ok(res, 'Report result should exist');
    assert.ok(Array.isArray(res.headers), `${cat} report should have headers array`);
    assert.ok(Array.isArray(res.data), `${cat} report should have data array`);
    assert.ok(typeof res.totalRecords === 'number', `${cat} report should have totalRecords number`);
    assert.ok(res.headers.length > 0, `${cat} headers should not be empty`);
  });
}

test('CSV Sanitization prevents spreadsheet formula injection', () => {
  assert.strictEqual(sanitizeForCSV('=1+1'), "'=1+1");
  assert.strictEqual(sanitizeForCSV('+SUM(A1:A10)'), "'+SUM(A1:A10)");
  assert.strictEqual(sanitizeForCSV('-50'), "'-50");
  assert.strictEqual(sanitizeForCSV('@cmd|'), "'@cmd|");
  assert.strictEqual(sanitizeForCSV('Safe Text'), 'Safe Text');
});

test('convertToCSV properly serializes headers and rows', () => {
  const headers = ['ID', 'Name', 'Role'];
  const data = [
    { ID: '1', Name: 'Alice, Smith', Role: 'worker' },
    { ID: '2', Name: 'Bob "The Builder"', Role: 'employer' },
  ];
  const csv = convertToCSV(headers, data);
  assert.ok(csv.includes('"ID","Name","Role"'), 'CSV should contain header line');
  assert.ok(csv.includes('"Alice, Smith"'), 'Values with commas should be quoted');
  assert.ok(csv.includes('"Bob ""The Builder"""'), 'Values with quotes should be escaped');
});

// --- 4. Date Query Filter Normalization ---
console.log('\n--- 4. Date Filter Normalization ---');

await asyncTest('SupabaseModel handles Date object range filters without 0-match bug', async () => {
  const { startDate, endDate } = parseDateRange({ dateRange: '30d' });
  const countWithDates = await Job.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } });
  const allCount = await Job.countDocuments({});
  // If jobs exist, count with 30d should match the recently seeded jobs
  if (allCount > 0) {
    assert.ok(countWithDates > 0, `30d filter should match seeded jobs (found ${countWithDates} of ${allCount})`);
  }
});

console.log(`\n======================================================`);
console.log(`SUITE COMPLETE: All ${passed} regression checks PASSED!`);
console.log(`======================================================\n`);
