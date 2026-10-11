// Test Runner for KaamSetu AI Test Suites
// Executes all suites sequentially, captures exit codes and outputs summary report

import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure test environment defaults are available to all child test processes
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_for_automated_test_suites_32chars_long';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
process.env.NODE_ENV = 'test';

const suites = [
  { name: '0. Supabase Database Migration & MongoDB Regression', file: 'database-migration.test.js' },
  { name: '1. Authentication & Role-Based Authorization', file: 'auth-authz.test.js' },
  { name: '2. Profile & Marketplace Workflow', file: 'marketplace.test.js' },
  { name: '3. Multi-Day Projects, Attendance, Progress & Payments', file: 'operations.test.js' },
  { name: '4. Real-time Communication, Notifications & Disputes', file: 'communication-support.test.js' },
  { name: '5. AI Summaries, Admin Assistant & Fraud Risk Analysis', file: 'ai-analytics.test.js' },
  { name: '6. Security Hardening & Penetration Defense', file: 'security-hardening.test.js' },
  { name: '7. Full Platform End-to-End Workflow (20 Steps)', file: 'e2e-workflow.test.js' },
  { name: '8. Registration Flow & CORS Policy Verification', file: 'registration-fix.test.js' },
  { name: '9. Worker Jobs Auth & Token Regression', file: 'worker-jobs-auth-regression.test.js' },
  { name: '10. Admin Reports, Analytics & UUID Validation Regression', file: 'admin-reports-analytics-regression.test.js' },
  { name: '11. Cross-Browser Auth & Reliability Regression', file: 'cross-browser-auth-reliability.test.js' },
  { name: '12. Job Details, Application Submission & Notifications Regression', file: 'job-details-application-notifications.test.js' },
];

console.log('================================================================');
console.log('KAAMSETU AI — EXECUTING COMPLETE AUTOMATED TEST SUITE');
console.log('================================================================\n');

const results = [];
let totalPassed = 0;
let totalFailed = 0;

for (const suite of suites) {
  const filePath = path.resolve(__dirname, suite.file);
  console.log(`>>> Starting: ${suite.name}`);
  const startTime = Date.now();

  const proc = spawnSync('node', [filePath], {
    stdio: 'inherit',
    env: process.env,
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const passed = proc.status === 0;

  if (passed) {
    totalPassed++;
    results.push({ name: suite.name, status: 'PASSED', duration: `${duration}s` });
  } else {
    totalFailed++;
    results.push({ name: suite.name, status: 'FAILED', duration: `${duration}s` });
  }
  console.log(`----------------------------------------------------------------\n`);
}

console.log('================================================================');
console.log('FINAL TEST EXECUTION SUMMARY REPORT');
console.log('================================================================');
for (const r of results) {
  const icon = r.status === 'PASSED' ? '✓' : '✗';
  console.log(`${icon} [${r.status}] ${r.name.padEnd(60)} (${r.duration})`);
}
console.log('================================================================');
console.log(`Total Suites: ${suites.length} | Passed: ${totalPassed} | Failed: ${totalFailed}`);
console.log('================================================================');

if (totalFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
