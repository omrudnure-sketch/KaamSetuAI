/**
 * KaamSetu AI — Safe Test Data Cleanup Script
 * 
 * Safely removes only the test records created by the test fixtures.
 * 
 * Safety features:
 * - Requires explicit confirmation flag (--confirm or CONFIRM_CLEANUP=true)
 * - Refuses production mode by default (requires ALLOW_PRODUCTION_CLEANUP=true)
 * - Deletes in strict foreign key dependency order (child records first)
 * - Never issues broad deletes; uses exact arrays of test IDs
 * - Dry-run mode (--dry-run) previews what records would be affected
 * - Completely preserves all existing real users, jobs, and platform data
 * - Generates audit report in testing/reports/
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve backend dependencies reliably across environments
const backendRequire = createRequire(path.resolve(__dirname, '../../backend/package.json'));
const dotenv = backendRequire('dotenv');

// Load environment variables safely
const explicitEnv = process.env.NODE_ENV;
const rootDir = path.resolve(__dirname, '../../');
dotenv.config({ path: path.resolve(rootDir, '.env') });
dotenv.config({ path: path.resolve(rootDir, 'backend/.env') });

// Fallback to deployment template for Supabase credentials if missing locally
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  dotenv.config({ path: path.resolve(rootDir, 'deployment/render.env') });
}

// Preserve developer environment if render.env populated NODE_ENV=production locally
if (!explicitEnv && process.env.NODE_ENV === 'production' && !process.env.RENDER && !process.env.VERCEL) {
  process.env.NODE_ENV = 'development';
}

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const hasConfirm = args.includes('--confirm') || process.env.CONFIRM_CLEANUP === 'true';
const isProduction = process.env.NODE_ENV === 'production';
const hasProdConfirm = args.includes('--confirm-production') || process.env.ALLOW_PRODUCTION_CLEANUP === 'true';

// 1. Safety Guard Checks
if (!hasConfirm && !isDryRun) {
  console.error('\n=============================================================');
  console.error('⛔ SAFETY ABORT: Cleanup requires explicit confirmation.');
  console.error('=============================================================');
  console.error('To run cleanup, specify the confirmation flag:');
  console.error('  node testing/scripts/cleanup-test-data.js --confirm');
  console.error('Or preview affected records with dry-run:');
  console.error('  node testing/scripts/cleanup-test-data.js --dry-run');
  console.error('=============================================================\n');
  process.exit(1);
}

if (isProduction && !hasProdConfirm) {
  console.error('\n=============================================================');
  console.error('🚨 PRODUCTION SAFEGUARD: Refusing to delete in production mode.');
  console.error('=============================================================');
  console.error('If you explicitly intend to clean up test data in production, set:');
  console.error('  ALLOW_PRODUCTION_CLEANUP=true node testing/scripts/cleanup-test-data.js --confirm');
  console.error('=============================================================\n');
  process.exit(1);
}

const dataDir = path.resolve(__dirname, '../data');
const reportsDir = path.resolve(__dirname, '../reports');

const loadJson = (filename) => {
  const filePath = path.join(dataDir, filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

async function main() {
  console.log('\n======================================================');
  console.log(`KAAMSETU AI — TEST DATA CLEANUP ${isDryRun ? '[DRY RUN - PREVIEW ONLY]' : ''}`);
  console.log('======================================================');

  // Dynamically import database access layer
  const { supabaseAdmin, query, checkSupabaseConnection } = await import('../../backend/src/config/supabase.js');

  const connectionStatus = await checkSupabaseConnection();
  if (!connectionStatus.postgres && !connectionStatus.supabaseClient) {
    throw new Error(`Database connection failed: ${connectionStatus.error || 'Unable to connect to Supabase'}`);
  }
  console.log('✓ Database connection confirmed.');

  const useSdk = Boolean(supabaseAdmin);
  console.log(`✓ Active data-access layer: ${useSdk ? 'Supabase Client SDK (HTTPS Service Role)' : 'PostgreSQL Pool'}`);

  // Collect exact test IDs from JSON fixtures
  const users = loadJson('sample-users.json');
  const workerProfiles = loadJson('sample-worker-profiles.json');
  const employerProfiles = loadJson('sample-employer-profiles.json');
  const jobs = loadJson('sample-jobs.json');
  const applications = loadJson('sample-applications.json');
  const invitations = loadJson('sample-invitations.json');
  const projects = loadJson('sample-projects.json');
  const attendances = loadJson('sample-attendance.json');
  const progressUpdates = loadJson('sample-progress-updates.json');
  const extensions = loadJson('sample-extensions.json');
  const payments = loadJson('sample-payments.json');
  const reviews = loadJson('sample-reviews.json');
  const messagesData = loadJson('sample-messages.json');
  const notifications = loadJson('sample-notifications.json');
  const complaints = loadJson('sample-complaints.json');
  const disputes = loadJson('sample-disputes.json');

  // Extract ID lists
  const disputeIds = disputes.map((d) => d.id);
  const complaintIds = complaints.map((c) => c.id);
  const notificationIds = notifications.map((n) => n.id);
  const messageIds = [];
  const conversationIds = [];
  for (const c of messagesData) {
    conversationIds.push(c.conversationId);
    if (Array.isArray(c.messages)) {
      messageIds.push(...c.messages.map((m) => m.id));
    }
  }
  const reviewIds = reviews.map((r) => r.id);
  const paymentIds = payments.map((p) => p.id);
  const extensionIds = extensions.map((e) => e.id);
  const progressIds = progressUpdates.map((p) => p.id);
  const attendanceIds = attendances.map((a) => a.id);
  const projectWorkerIds = [];
  const hiringAgreementIds = [];
  const projectIds = projects.map((p) => {
    if (p.hiringAgreement?.id) hiringAgreementIds.push(p.hiringAgreement.id);
    if (Array.isArray(p.projectWorkers)) {
      projectWorkerIds.push(...p.projectWorkers.map((pw) => pw.id));
    }
    return p.id;
  });
  const applicationIds = applications.map((a) => a.id);
  const invitationIds = invitations.map((i) => i.id);
  const jobIds = jobs.map((j) => j.id);
  const workerProfileIds = workerProfiles.map((wp) => wp.id);
  const employerProfileIds = employerProfiles.map((ep) => ep.id);
  const userIds = users.map((u) => u.id);

  // Helper to delete by exact ID array in foreign key dependency order
  const deleteBatch = async (table, idList) => {
    if (!idList || idList.length === 0) return 0;
    let count = 0;

    if (useSdk) {
      const { data, error } = await supabaseAdmin.from(table).select('id').in('id', idList);
      if (error) throw error;
      count = data ? data.length : 0;

      if (count > 0 && !isDryRun) {
        const { error: delError } = await supabaseAdmin.from(table).delete().in('id', idList);
        if (delError) throw delError;
      }
    } else {
      const checkRes = await query(
        `SELECT count(*)::int as count FROM ${table} WHERE id = ANY($1::uuid[])`,
        [idList]
      );
      count = checkRes.rows[0]?.count || 0;

      if (count > 0 && !isDryRun) {
        await query(`DELETE FROM ${table} WHERE id = ANY($1::uuid[])`, [idList]);
      }
    }
    return count;
  };

  const results = {};

  // Dependency order (Child tables first -> Parent tables last)
  console.log('\n>>> Cleaning up child dependency tables...');
  results.disputes = await deleteBatch('disputes', disputeIds);
  results.complaints = await deleteBatch('complaints', complaintIds);
  results.notifications = await deleteBatch('notifications', notificationIds);
  results.messages = await deleteBatch('messages', messageIds);
  results.conversations = await deleteBatch('conversations', conversationIds);
  results.reviews = await deleteBatch('reviews', reviewIds);
  results.payments = await deleteBatch('payments', paymentIds);
  results.project_extensions = await deleteBatch('project_extensions', extensionIds);
  results.progress_updates = await deleteBatch('progress_updates', progressIds);
  results.attendances = await deleteBatch('attendances', attendanceIds);
  results.project_workers = await deleteBatch('project_workers', projectWorkerIds);

  console.log('>>> Cleaning up projects and agreements...');
  results.projects = await deleteBatch('projects', projectIds);
  results.hiring_agreements = await deleteBatch('hiring_agreements', hiringAgreementIds);

  console.log('>>> Cleaning up jobs and applications...');
  results.job_applications = await deleteBatch('job_applications', applicationIds);
  results.job_invitations = await deleteBatch('job_invitations', invitationIds);
  results.jobs = await deleteBatch('jobs', jobIds);

  console.log('>>> Cleaning up profiles and users...');
  results.worker_profiles = await deleteBatch('worker_profiles', workerProfileIds);
  results.employer_profiles = await deleteBatch('employer_profiles', employerProfileIds);
  results.users = await deleteBatch('users', userIds);

  // Summary
  console.log('\n======================================================');
  console.log(`CLEANUP SUMMARY ${isDryRun ? '(DRY RUN - ZERO RECORDS REMOVED)' : '(COMPLETED)'}`);
  console.log('======================================================');
  let totalDeleted = 0;
  for (const [table, count] of Object.entries(results)) {
    totalDeleted += count;
    console.log(`  • ${table.padEnd(22)}: ${String(count).padStart(3)} records ${isDryRun ? 'targeted' : 'deleted'}`);
  }
  console.log('------------------------------------------------------');
  console.log(`Total test records ${isDryRun ? 'identified for deletion' : 'deleted'}: ${totalDeleted}`);
  console.log('======================================================');

  // Report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(reportsDir, `cleanup-report-${timestamp}.json`);
  const reportPayload = {
    timestamp: new Date().toISOString(),
    mode: isDryRun ? 'dry-run' : 'live-cleanup',
    results,
    totalAffected: totalDeleted,
  };
  fs.writeFileSync(reportPath, JSON.stringify(reportPayload, null, 2), 'utf8');
  console.log(`✓ Cleanup report saved to: testing/reports/cleanup-report-${timestamp}.json\n`);

  process.exit(0);
}

main().catch((err) => {
  console.error('\n✗ Error during test data cleanup:', err.message || err);
  process.exit(1);
});
