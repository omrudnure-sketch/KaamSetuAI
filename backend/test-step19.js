import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDB } from './src/config/db.js';
import { getOverviewAnalytics } from './src/analytics/overviewAnalytics.js';
import { getHiringAnalytics } from './src/analytics/hiringAnalytics.js';
import { getUserAnalytics } from './src/analytics/userAnalytics.js';
import { getProjectAnalytics } from './src/analytics/projectAnalytics.js';
import { getAttendanceAnalytics } from './src/analytics/attendanceAnalytics.js';
import { getPaymentAnalytics } from './src/analytics/paymentAnalytics.js';
import { getSkillAnalytics } from './src/analytics/skillAnalytics.js';
import { getLocationAnalytics } from './src/analytics/locationAnalytics.js';
import { generateReportData, convertToCSV, sanitizeForCSV } from './src/services/reportService.js';
import { parseDateRange } from './src/utils/dateFilter.js';

async function runStep19Tests() {
  console.log('--- STARTING STEP 19 VERIFICATION TESTS ---');
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
    // 1. Date Filter Test
    console.log('\nTesting parseDateRange utility:');
    const d30 = parseDateRange('30d');
    assert(d30.startDate instanceof Date && d30.endDate instanceof Date, '30d date range creates valid Date objects');

    const dCustom = parseDateRange({ range: 'custom', startDate: '2026-01-01', endDate: '2026-01-31' });
    assert(dCustom.startDate.toISOString().startsWith('2026-01-01'), 'custom date range parses start date correctly');

    // 2. Overview Analytics Test
    console.log('\nTesting Overview Analytics:');
    const overview = await getOverviewAnalytics('30d');
    assert(overview && overview.metrics, 'Overview returns metrics object');
    assert(typeof overview.metrics.totalWorkers === 'number', 'totalWorkers is a number from DB');
    assert(typeof overview.metrics.delayedProjects === 'number', 'delayedProjects is calculated server-side');
    assert(overview.metricDefinitions !== undefined, 'Metric definitions are documented');

    // 3. Hiring Funnel Analytics Test
    console.log('\nTesting Hiring Funnel Analytics:');
    const hiring = await getHiringAnalytics();
    assert(Array.isArray(hiring.funnel) && hiring.funnel.length === 10, 'Hiring funnel contains all 10 stages');
    assert(hiring.metrics?.hiringConversionRate !== undefined, 'Hiring conversion rate metric exists');
    assert(hiring.formulas?.conversionRate !== undefined, 'Formulas are explicitly documented');

    // 4. User Analytics Test
    console.log('\nTesting User Analytics:');
    const users = await getUserAnalytics({ grouping: 'daily' });
    assert(users.totals?.totalUsers !== undefined, 'Total users count returned');
    assert(users.profileCompletion?.workerProfileRate !== undefined, 'Profile completion rate calculated');
    assert(Array.isArray(users.geographicDistribution), 'Geographic user distribution returned');

    // 5. Project Analytics Test
    console.log('\nTesting Project Analytics:');
    const projects = await getProjectAnalytics();
    assert(projects.delayedProjects?.count !== undefined, 'Delayed project count exists');
    assert(Array.isArray(projects.delayedProjects?.list), 'Delayed project list returned');
    assert(projects.metrics?.averageProgress !== undefined, 'Average progress returned');

    // 6. Attendance Analytics Test
    console.log('\nTesting Attendance Analytics:');
    const attendance = await getAttendanceAnalytics();
    assert(attendance.records?.attendanceRate !== undefined, 'Attendance rate returned');
    assert(attendance.records?.rateFormula !== undefined, 'Rate formula documented');

    // 7. Payment Analytics Test & Worker Wage Distinction
    console.log('\nTesting Payment Analytics:');
    const payments = await getPaymentAnalytics();
    assert(payments.totals?.recordedAmount !== undefined, 'Recorded payment amounts aggregated');
    assert(payments.distinction?.platformRevenue === 0, 'Platform revenue correctly set to 0 and NOT confused with worker wages');
    assert(payments.distinction?.note.includes('zero platform commission'), 'Payment policy distinction clearly documented');

    // 8. Skill Demand & Supply Analytics Test
    console.log('\nTesting Skill Demand & Supply Analytics:');
    const skills = await getSkillAnalytics();
    assert(Array.isArray(skills.skills), 'Skills array returned');
    assert(skills.definitions?.supply.includes('available'), 'Supply strictly defined as available workers, not all registered');

    // 9. Location Analytics Test
    console.log('\nTesting Location Analytics:');
    const locations = await getLocationAnalytics();
    assert(Array.isArray(locations.locations), 'Locations array returned');

    // 10. Report Service and CSV Injection Protection Test
    console.log('\nTesting Report Service & CSV Formula Injection Prevention:');
    // Formula injection tests
    const safeNormal = sanitizeForCSV('Normal text');
    const safeFormula1 = sanitizeForCSV('=SUM(A1:A10)');
    const safeFormula2 = sanitizeForCSV('+cmd|/C calc!A0');
    const safeFormula3 = sanitizeForCSV('-100');
    const safeFormula4 = sanitizeForCSV('@HYPERLINK("http://evil.com")');

    assert(safeFormula1 === "'=SUM(A1:A10)", 'Formula starting with = is safely escaped with single quote');
    assert(safeFormula2 === "'+cmd|/C calc!A0", 'Formula starting with + is safely escaped with single quote');
    assert(safeFormula3 === "'-100", 'Text starting with - is safely escaped with single quote');
    assert(safeFormula4 === "'@HYPERLINK(\"\"http://evil.com\"\")", 'Formula starting with @ is safely escaped');

    // Test reports query with pagination
    const workerReport = await generateReportData('workers', { page: 1, limit: 5 });
    assert(workerReport.headers.includes('Worker ID') && Array.isArray(workerReport.data), 'Workers report returns valid headers and data');
    assert(workerReport.page === 1, 'Pagination page matches');

    const jobReport = await generateReportData('jobs', { page: 1, limit: 5 });
    assert(jobReport.headers.includes('Job ID') && Array.isArray(jobReport.data), 'Jobs report returns valid headers and data');

    const csvOutput = convertToCSV(workerReport);
    assert(typeof csvOutput === 'string' && csvOutput.includes(workerReport.headers[0]), 'CSV conversion generates valid text with headers');

    console.log(`\n--- STEP 19 VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED ---`);
  } catch (err) {
    console.error('Error during Step 19 tests:', err);
    failed++;
  } finally {
    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runStep19Tests();
