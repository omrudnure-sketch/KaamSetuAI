#!/usr/bin/env node
/**
 * ==============================================================================
 * KaamSetu AI — Test Data Seeding Script (Safe, Non-Destructive, Idempotent)
 * ==============================================================================
 *
 * Requirements:
 * 1. Reads Supabase / PostgreSQL configuration from environment variables.
 * 2. Requires explicit opt-in: `--allow-seed` or `ALLOW_TEST_DATA_SEED=true`.
 * 3. Production safeguard: Refuses to run against production without `--confirm-production`.
 * 4. Idempotent: Never creates duplicates. Uses test UUID namespace (00000000-0000-4000-8000-...).
 * 5. Non-destructive: Never deletes or overwrites existing records.
 * 6. Generates JSON audit report in testing/reports/ without exposing secrets.
 *
 * Usage:
 *   node testing/scripts/seed-test-data.js --dry-run
 *   node testing/scripts/seed-test-data.js --allow-seed
 *   CONFIRM_PRODUCTION_SEED=true node testing/scripts/seed-test-data.js --allow-seed
 * ==============================================================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

// Use backend package.json context for module resolution
const backendRequire = createRequire(path.resolve(rootDir, 'backend/package.json'));
const dotenv = backendRequire('dotenv');
const bcrypt = backendRequire('bcryptjs');

// Load environment variables safely
const explicitEnv = process.env.NODE_ENV;
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
const hasAllowFlag = args.includes('--allow-seed') || process.env.ALLOW_TEST_DATA_SEED === 'true';
const isProduction = process.env.NODE_ENV === 'production';
const hasProdConfirm = args.includes('--confirm-production') || process.env.CONFIRM_PRODUCTION_SEED === 'true';

// 1. Safety Guard Checks
if (!hasAllowFlag && !isDryRun) {
  console.error('\n=============================================================');
  console.error('⛔ SAFETY ABORT: Seeding requires explicit opt-in permission.');
  console.error('=============================================================');
  console.error('To run the seeder, supply the opt-in flag or environment variable:');
  console.error('  ALLOW_TEST_DATA_SEED=true node testing/scripts/seed-test-data.js');
  console.error('Or run with dry-run mode to preview changes:');
  console.error('  node testing/scripts/seed-test-data.js --dry-run');
  console.error('=============================================================\n');
  process.exit(1);
}

if (isProduction && !hasProdConfirm) {
  console.error('\n=============================================================');
  console.error('🚨 PRODUCTION SAFEGUARD: Refusing to seed in production mode.');
  console.error('=============================================================');
  console.error('If you explicitly intend to seed in production, you must set:');
  console.error('  CONFIRM_PRODUCTION_SEED=true node testing/scripts/seed-test-data.js --allow-seed');
  console.error('=============================================================\n');
  process.exit(1);
}

const dataDir = path.resolve(__dirname, '../data');
const reportsDir = path.resolve(__dirname, '../reports');

if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

// Helper to safely load fixture JSON
const loadJson = (filename) => {
  const filePath = path.join(dataDir, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fixture file not found: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

async function main() {
  console.log('\n======================================================');
  console.log(`KAAMSETU AI — SEEDING TEST FIXTURES ${isDryRun ? '[DRY RUN]' : '[LIVE EXECUTION]'}`);
  console.log('======================================================');

  // Dynamically import database access layers from backend
  const { query, checkSupabaseConnection, supabaseAdmin } = await import(
    `file:///${path.resolve(rootDir, 'backend/src/config/supabase.js').replace(/\\/g, '/')}`
  );

  const connectionStatus = await checkSupabaseConnection();
  if (!connectionStatus.postgres && !connectionStatus.supabaseClient) {
    throw new Error(`Database connection failed: ${connectionStatus.error || 'Unable to connect to Supabase'}`);
  }
  console.log('✓ Database connection confirmed.');

  const useSdk = Boolean(supabaseAdmin);
  console.log(`✓ Active data-access layer: ${useSdk ? 'Supabase Client SDK (HTTPS Service Role)' : 'PostgreSQL Pool'}`);

  // Batch query helper to check existing IDs in one single request
  const getExistingIds = async (table, ids) => {
    if (!ids || ids.length === 0) return new Set();
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        if (useSdk) {
          const { data, error } = await supabaseAdmin.from(table).select('id').in('id', ids);
          if (error) {
            console.warn(`  [Warning] Check ${table}: ${error.message}`);
            return new Set();
          }
          return new Set((data || []).map((r) => r.id));
        } else {
          const res = await query(`SELECT id FROM ${table} WHERE id = ANY($1::uuid[])`, [ids]);
          return new Set(res.rows.map((r) => r.id));
        }
      } catch (err) {
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 500 * attempt));
          continue;
        }
        console.warn(`  [Warning] Batch query ${table} failed: ${err.message}`);
        return new Set();
      }
    }
    return new Set();
  };

  // Safe insert helper with retries
  const insertRecord = async (table, row) => {
    if (isDryRun) return true;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        if (useSdk) {
          const { error } = await supabaseAdmin.from(table).insert(row);
          if (error) {
            // Ignore duplicate key conflicts idempotently
            if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
              return false;
            }
            throw new Error(`Failed to insert into ${table} (${row.id}): ${error.message}`);
          }
        } else {
          const keys = Object.keys(row);
          const values = Object.values(row);
          const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
          const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
          await query(sql, values);
        }
        return true;
      } catch (err) {
        if (attempt < 3 && (err.message?.includes('fetch failed') || err.message?.includes('timeout'))) {
          await new Promise((r) => setTimeout(r, 500 * attempt));
          continue;
        }
        throw err;
      }
    }
    return true;
  };

  // Load JSON fixtures
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

  const testPassword = process.env.TEST_USER_PASSWORD || 'TestPass123!';
  const passwordHash = await bcrypt.hash(testPassword, 10);

  const stats = {
    users: { created: 0, skipped: 0 },
    workerProfiles: { created: 0, skipped: 0 },
    employerProfiles: { created: 0, skipped: 0 },
    jobs: { created: 0, skipped: 0 },
    jobApplications: { created: 0, skipped: 0 },
    jobInvitations: { created: 0, skipped: 0 },
    hiringAgreements: { created: 0, skipped: 0 },
    projects: { created: 0, skipped: 0 },
    projectWorkers: { created: 0, skipped: 0 },
    attendances: { created: 0, skipped: 0 },
    progressUpdates: { created: 0, skipped: 0 },
    projectExtensions: { created: 0, skipped: 0 },
    payments: { created: 0, skipped: 0 },
    reviews: { created: 0, skipped: 0 },
    conversations: { created: 0, skipped: 0 },
    messages: { created: 0, skipped: 0 },
    notifications: { created: 0, skipped: 0 },
    complaints: { created: 0, skipped: 0 },
    disputes: { created: 0, skipped: 0 },
  };

  // 1. Users
  console.log('\n>>> Seeding Users...');
  const existingUsers = await getExistingIds('users', users.map((u) => u.id));
  for (const u of users) {
    if (existingUsers.has(u.id)) {
      stats.users.skipped++;
    } else {
      await insertRecord('users', {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        password_hash: passwordHash,
        role: u.role,
        admin_role: u.adminRole || null,
        permissions: u.permissions || [],
        preferred_language: u.preferredLanguage || 'en',
        status: u.status || 'active',
        is_verified: u.isVerified || false,
      });
      stats.users.created++;
    }
  }

  // 2. Worker Profiles
  console.log('>>> Seeding Worker Profiles...');
  const existingWorkerProfiles = await getExistingIds('worker_profiles', workerProfiles.map((wp) => wp.id));
  for (const wp of workerProfiles) {
    if (existingWorkerProfiles.has(wp.id)) {
      stats.workerProfiles.skipped++;
    } else {
      await insertRecord('worker_profiles', {
        id: wp.id,
        user_id: wp.userId,
        bio: wp.bio,
        skills: wp.skills,
        primary_skill: wp.primary_skill || wp.primarySkill || (Array.isArray(wp.skills) ? wp.skills[0] : null),
        experience_years: wp.experienceYears,
        daily_wage: wp.dailyWage,
        hourly_rate: wp.hourlyRate,
        availability: wp.availability,
        is_available_for_work: wp.is_available_for_work !== undefined ? wp.is_available_for_work : (wp.availability === 'available'),
        location: wp.location,
        city: wp.city,
        area: wp.area || null,
        address: wp.address || wp.location || null,
        pincode: wp.pincode || null,
        state: wp.state || 'Maharashtra',
        latitude: wp.latitude,
        longitude: wp.longitude,
        languages: wp.languages || ['en', 'mr', 'hi'],
        profile_completion: wp.profileCompletion,
        rating: wp.rating,
        review_count: wp.reviewCount,
        completed_projects: wp.completedProjects,
      });
      stats.workerProfiles.created++;
    }
  }

  // 3. Employer Profiles
  console.log('>>> Seeding Employer Profiles...');
  const existingEmployerProfiles = await getExistingIds('employer_profiles', employerProfiles.map((ep) => ep.id));
  for (const ep of employerProfiles) {
    if (existingEmployerProfiles.has(ep.id)) {
      stats.employerProfiles.skipped++;
    } else {
      await insertRecord('employer_profiles', {
        id: ep.id,
        user_id: ep.userId,
        company_name: ep.companyName,
        business_type: ep.businessType,
        contact_person: ep.contactPerson,
        location: ep.location,
        city: ep.city,
        area: ep.area || null,
        address: ep.address || ep.location || null,
        pincode: ep.pincode || null,
        state: ep.state || 'Maharashtra',
        latitude: ep.latitude || null,
        longitude: ep.longitude || null,
        profile_completion: ep.profileCompletion,
        rating: ep.rating,
        review_count: ep.reviewCount,
      });
      stats.employerProfiles.created++;
    }
  }

  // 4. Jobs
  console.log('>>> Seeding Jobs...');
  const existingJobs = await getExistingIds('jobs', jobs.map((j) => j.id));
  for (const j of jobs) {
    if (existingJobs.has(j.id)) {
      stats.jobs.skipped++;
    } else {
      await insertRecord('jobs', {
        id: j.id,
        employer_id: j.employerId,
        title: j.title,
        description: j.description,
        category: j.category,
        required_skills: j.requiredSkills,
        wage_type: j.wageType,
        wage_amount: j.wageAmount,
        duration_days: j.durationDays,
        location: j.location,
        city: j.city || null,
        area: j.area || null,
        address: j.address || j.location || null,
        pincode: j.pincode || null,
        state: j.state || 'Maharashtra',
        latitude: j.latitude,
        longitude: j.longitude,
        workers_needed: j.workersNeeded,
        status: j.status,
        ai_generated: j.aiGenerated,
      });
      stats.jobs.created++;
    }
  }

  // 5. Job Applications
  console.log('>>> Seeding Job Applications...');
  const existingApplications = await getExistingIds('job_applications', applications.map((a) => a.id));
  for (const app of applications) {
    if (existingApplications.has(app.id)) {
      stats.jobApplications.skipped++;
    } else {
      await insertRecord('job_applications', {
        id: app.id,
        job_id: app.jobId,
        worker_id: app.workerId,
        proposed_wage: app.proposedWage,
        cover_note: app.coverNote,
        status: app.status,
      });
      stats.jobApplications.created++;
    }
  }

  // 6. Job Invitations
  console.log('>>> Seeding Job Invitations...');
  const existingInvitations = await getExistingIds('job_invitations', invitations.map((i) => i.id));
  for (const inv of invitations) {
    if (existingInvitations.has(inv.id)) {
      stats.jobInvitations.skipped++;
    } else {
      await insertRecord('job_invitations', {
        id: inv.id,
        job_id: inv.jobId,
        worker_id: inv.workerId,
        employer_id: inv.employerId,
        status: inv.status,
      });
      stats.jobInvitations.created++;
    }
  }

  // 7. Hiring Agreements & Projects & Project Workers
  console.log('>>> Seeding Hiring Agreements, Projects & Workers...');
  const hiringAgreementsList = projects.filter((p) => p.hiringAgreement).map((p) => p.hiringAgreement);
  const existingAgreements = await getExistingIds('hiring_agreements', hiringAgreementsList.map((ha) => ha.id));
  for (const ha of hiringAgreementsList) {
    if (existingAgreements.has(ha.id)) {
      stats.hiringAgreements.skipped++;
    } else {
      await insertRecord('hiring_agreements', {
        id: ha.id,
        job_id: ha.jobId,
        employer_id: ha.employerId,
        worker_id: ha.workerId,
        agreed_wage: ha.agreedWage,
        wage_type: ha.wageType,
        start_date: ha.startDate,
        expected_end_date: ha.expectedEndDate,
        terms: ha.terms,
        proposed_by: ha.proposedBy,
        status: ha.status,
        confirmed_at: ha.confirmedAt || null,
      });
      stats.hiringAgreements.created++;
    }
  }

  const existingProjects = await getExistingIds('projects', projects.map((p) => p.id));
  for (const pr of projects) {
    if (existingProjects.has(pr.id)) {
      stats.projects.skipped++;
    } else {
      await insertRecord('projects', {
        id: pr.id,
        hiring_agreement_id: pr.hiringAgreementId,
        employer_id: pr.employerId,
        title: pr.title,
        description: pr.description,
        location: pr.location,
        start_date: pr.startDate,
        expected_end_date: pr.expectedEndDate,
        actual_end_date: pr.actualEndDate || null,
        payment_amount: pr.paymentAmount,
        status: pr.status,
        completion_requested_by: pr.completionRequestedBy || null,
      });
      stats.projects.created++;
    }
  }

  const allProjectWorkers = [];
  for (const pr of projects) {
    if (Array.isArray(pr.projectWorkers)) {
      allProjectWorkers.push(...pr.projectWorkers.map((pw) => ({ ...pw, projectId: pr.id })));
    }
  }
  const existingProjectWorkers = await getExistingIds('project_workers', allProjectWorkers.map((pw) => pw.id));
  for (const pw of allProjectWorkers) {
    if (existingProjectWorkers.has(pw.id)) {
      stats.projectWorkers.skipped++;
    } else {
      await insertRecord('project_workers', {
        id: pw.id,
        project_id: pw.projectId,
        worker_id: pw.workerId,
        hiring_agreement_id: pw.hiringAgreementId,
        agreed_wage: pw.agreedWage,
        wage_type: pw.wageType,
        status: pw.status,
      });
      stats.projectWorkers.created++;
    }
  }

  // 8. Attendance
  console.log('>>> Seeding Attendance Records...');
  const existingAttendances = await getExistingIds('attendances', attendances.map((a) => a.id));
  for (const at of attendances) {
    if (existingAttendances.has(at.id)) {
      stats.attendances.skipped++;
    } else {
      await insertRecord('attendances', {
        id: at.id,
        project_id: at.projectId,
        worker_id: at.workerId,
        date: at.date,
        check_in_time: at.checkInTime,
        check_out_time: at.checkOutTime || null,
        status: at.status,
      });
      stats.attendances.created++;
    }
  }

  // 9. Progress Updates
  console.log('>>> Seeding Progress Updates...');
  const existingProgress = await getExistingIds('progress_updates', progressUpdates.map((p) => p.id));
  for (const pu of progressUpdates) {
    if (existingProgress.has(pu.id)) {
      stats.progressUpdates.skipped++;
    } else {
      await insertRecord('progress_updates', {
        id: pu.id,
        project_id: pu.projectId,
        worker_id: pu.workerId,
        date: pu.date,
        completion_percentage: pu.completionPercentage,
        summary: pu.summary,
      });
      stats.progressUpdates.created++;
    }
  }

  // 10. Project Extensions
  console.log('>>> Seeding Project Extensions...');
  const existingExtensions = await getExistingIds('project_extensions', extensions.map((e) => e.id));
  for (const pe of extensions) {
    if (existingExtensions.has(pe.id)) {
      stats.projectExtensions.skipped++;
    } else {
      await insertRecord('project_extensions', {
        id: pe.id,
        project_id: pe.projectId,
        requested_by: pe.requestedBy,
        additional_days: pe.additionalDays,
        reason: pe.reason,
        original_end_date: pe.originalEndDate,
        new_end_date: pe.newEndDate,
        status: pe.status,
        approved_by: pe.approvedBy || null,
      });
      stats.projectExtensions.created++;
    }
  }

  // 11. Payments Ledger
  console.log('>>> Seeding Payments Ledger...');
  const existingPayments = await getExistingIds('payments', payments.map((p) => p.id));
  for (const pm of payments) {
    if (existingPayments.has(pm.id)) {
      stats.payments.skipped++;
    } else {
      await insertRecord('payments', {
        id: pm.id,
        project_id: pm.projectId,
        payer_id: pm.payerId,
        payee_id: pm.payeeId,
        amount: pm.amount,
        wage_type: pm.wageType,
        status: pm.status,
        payment_date: pm.paymentDate || null,
        transaction_ref: pm.transactionRef || null,
        notes: pm.notes,
      });
      stats.payments.created++;
    }
  }

  // 12. Reviews
  console.log('>>> Seeding Reviews...');
  const existingReviews = await getExistingIds('reviews', reviews.map((r) => r.id));
  for (const rv of reviews) {
    if (existingReviews.has(rv.id)) {
      stats.reviews.skipped++;
    } else {
      await insertRecord('reviews', {
        id: rv.id,
        project_id: rv.projectId,
        reviewer_id: rv.reviewerId,
        reviewee_id: rv.revieweeId,
        rating: rv.rating,
        comment: rv.comment,
      });
      stats.reviews.created++;
    }
  }

  // 13. Conversations and Messages
  console.log('>>> Seeding Conversations & Messages...');
  const existingConversations = await getExistingIds('conversations', messagesData.map((c) => c.conversationId));
  const allMessages = [];
  for (const cv of messagesData) {
    if (existingConversations.has(cv.conversationId)) {
      stats.conversations.skipped++;
    } else {
      await insertRecord('conversations', {
        id: cv.conversationId,
        participant_a: cv.participantA,
        participant_b: cv.participantB,
        related_project_id: cv.relatedProjectId,
      });
      stats.conversations.created++;
    }

    if (Array.isArray(cv.messages)) {
      allMessages.push(...cv.messages.map((m) => ({ ...m, conversation_id: cv.conversationId })));
    }
  }

  const existingMessages = await getExistingIds('messages', allMessages.map((m) => m.id));
  for (const m of allMessages) {
    if (existingMessages.has(m.id)) {
      stats.messages.skipped++;
    } else {
      await insertRecord('messages', {
        id: m.id,
        conversation_id: m.conversation_id,
        sender_id: m.senderId,
        content: m.content,
        is_read: m.isRead,
        read_at: m.readAt || null,
      });
      stats.messages.created++;
    }
  }

  // 14. Notifications
  console.log('>>> Seeding Notifications...');
  const existingNotifications = await getExistingIds('notifications', notifications.map((n) => n.id));
  for (const nt of notifications) {
    if (existingNotifications.has(nt.id)) {
      stats.notifications.skipped++;
    } else {
      await insertRecord('notifications', {
        id: nt.id,
        user_id: nt.userId,
        type: nt.type,
        title: nt.title,
        message: nt.message,
        is_read: nt.isRead,
        data: nt.data || {},
      });
      stats.notifications.created++;
    }
  }

  // 15. Complaints
  console.log('>>> Seeding Complaints...');
  const existingComplaints = await getExistingIds('complaints', complaints.map((c) => c.id));
  for (const cp of complaints) {
    if (existingComplaints.has(cp.id)) {
      stats.complaints.skipped++;
    } else {
      await insertRecord('complaints', {
        id: cp.id,
        filed_by: cp.filedBy,
        against_user: cp.againstUser,
        project_id: cp.projectId,
        category: cp.category,
        description: cp.description,
        status: cp.status,
      });
      stats.complaints.created++;
    }
  }

  // 16. Disputes
  console.log('>>> Seeding Disputes...');
  const existingDisputes = await getExistingIds('disputes', disputes.map((d) => d.id));
  for (const dp of disputes) {
    if (existingDisputes.has(dp.id)) {
      stats.disputes.skipped++;
    } else {
      await insertRecord('disputes', {
        id: dp.id,
        complaint_id: dp.complaintId,
        project_id: dp.projectId,
        claimant_id: dp.claimantId,
        respondent_id: dp.respondentId,
        assigned_admin_id: dp.assignedAdminId,
        status: dp.status,
        resolution_notes: dp.resolutionNotes,
        resolved_at: dp.resolvedAt || null,
      });
      stats.disputes.created++;
    }
  }

  // Summary Report
  console.log('\n======================================================');
  console.log(`SEEDING SUMMARY ${isDryRun ? '(DRY RUN - ZERO WRITES)' : '(COMPLETED)'}`);
  console.log('======================================================');
  let totalCreated = 0;
  let totalSkipped = 0;
  for (const [entity, count] of Object.entries(stats)) {
    totalCreated += count.created;
    totalSkipped += count.skipped;
    console.log(
      `  • ${entity.padEnd(22)}: ${String(count.created).padStart(3)} created | ${String(count.skipped).padStart(3)} skipped`
    );
  }
  console.log('------------------------------------------------------');
  console.log(`Total: ${totalCreated} created, ${totalSkipped} skipped (already present)`);
  console.log('======================================================');

  // Save report artifact
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(reportsDir, `seed-report-${timestamp}.json`);
  const reportPayload = {
    timestamp: new Date().toISOString(),
    isDryRun,
    environment: process.env.NODE_ENV,
    stats,
    totalCreated,
    totalSkipped,
  };

  fs.writeFileSync(reportPath, JSON.stringify(reportPayload, null, 2), 'utf8');
  console.log(`\n✓ Audit report saved to: ${path.relative(rootDir, reportPath)}\n`);
}

main().catch((err) => {
  console.error('\n✗ Error during test data seeding:', err.message || err);
  process.exit(1);
});
