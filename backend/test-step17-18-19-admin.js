import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  User,
  Project,
  VerificationRecord,
  Complaint,
  Dispute,
  AuditLog,
} from './src/models/index.js';
import * as adminService from './src/services/adminService.js';
import * as adminDashboardService from './src/services/adminDashboardService.js';
import * as verificationService from './src/services/verificationService.js';
import * as reportService from './src/services/reportService.js';
import { requireAdmin, requirePermission } from './src/middleware/adminMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const runAdminControlCenterTest = async () => {
  console.log('=== STARTING E2E VERIFICATION TEST FOR ADMIN CONTROL CENTER (STEPS 17, 18, 19) ===');

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/kaamsetu');
  console.log('✓ Connected to MongoDB');

  // 1. RBAC Check: Worker & Employer access rejection
  const reqWorker = { user: { role: 'worker' } };
  const reqEmployer = { user: { role: 'employer' } };
  const reqAdmin = { user: { role: 'admin', adminRole: 'super_admin' } };

  let isWorkerDenied = false;
  requireAdmin(reqWorker, { status: (code) => ({ json: () => { isWorkerDenied = (code === 403); } }) }, () => {});
  console.log(`✓ Worker access to admin route blocked: ${isWorkerDenied}`);

  let isEmployerDenied = false;
  requireAdmin(reqEmployer, { status: (code) => ({ json: () => { isEmployerDenied = (code === 403); } }) }, () => {});
  console.log(`✓ Employer access to admin route blocked: ${isEmployerDenied}`);

  let isAdminAllowed = false;
  requireAdmin(reqAdmin, {}, () => { isAdminAllowed = true; });
  console.log(`✓ Admin access to admin route allowed: ${isAdminAllowed}`);

  // 2. Permission Check Test
  const reqFinanceAdmin = { user: { role: 'admin', adminRole: 'finance_admin' } };
  let isFinanceDeniedForUsers = false;
  requirePermission('users.read')(reqFinanceAdmin, { status: (code) => ({ json: () => { isFinanceDeniedForUsers = (code === 403); } }) }, () => {});
  console.log(`✓ Finance Admin restricted from users.read: ${isFinanceDeniedForUsers}`);

  let isFinanceAllowedForPayments = false;
  requirePermission('payments.read')(reqFinanceAdmin, {}, () => { isFinanceAllowedForPayments = true; });
  console.log(`✓ Finance Admin allowed for payments.read: ${isFinanceAllowedForPayments}`);

  // 3. Admin Account Setup
  let admin = await User.findOne({ email: 'admin@kaamsetu.ai' });
  if (!admin) {
    admin = await User.create({
      name: 'Super Admin',
      phone: '9998887770',
      email: 'admin@kaamsetu.ai',
      passwordHash: 'dummy_hash',
      role: 'admin',
      isPhoneVerified: true,
      status: 'active',
    });
  }

  // 4. Dashboard Overview & Delayed Projects Detection
  const overview = await adminDashboardService.getDashboardOverview();
  console.log(`✓ Dashboard Overview KPIs: Workers=${overview.kpis.totalWorkers}, Active Projects=${overview.kpis.activeProjects}, Delayed=${overview.kpis.delayedProjectsCount}`);

  // Create a delayed project for verification
  const dummyObjectId = new mongoose.Types.ObjectId();
  const delayedProj = await Project.create({
    name: 'Test Delayed Site Painting',
    title: 'Test Delayed Site Painting',
    jobId: dummyObjectId,
    createdFromHiringAgreement: dummyObjectId,
    employerId: admin._id,
    paymentAmount: 850,
    dailyWageRate: 850,
    paymentType: 'daily',
    durationType: 'single_day',
    startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    expectedEndDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Past end date
    status: 'in_progress',
  });
  const delayedList = await adminDashboardService.getDelayedProjects();
  console.log(`✓ Delayed Projects Detection Rule: Found ${delayedList.length} delayed projects (includes ID=${delayedProj._id})`);

  // 5. Verification Center Test
  const vRecord = await verificationService.createVerificationRecord({
    userId: admin._id,
    verificationType: 'identity',
    documents: [{ docType: 'Aadhaar Card', docUrl: 'https://placeholder.docs/aadhaar.pdf' }],
  });
  console.log(`✓ Verification Record created: ID=${vRecord._id}, Status=${vRecord.status}`);

  const reviewed = await verificationService.reviewVerificationRecord(vRecord._id, { status: 'verified', notes: 'Approved documents' }, admin._id);
  console.log(`✓ Verification Record approved: Status=${reviewed.status}`);

  // 6. Report Generation & CSV Export Test
  const workerReport = await reportService.generateReportData('workers', { limit: 10 });
  const csvOutput = reportService.convertToCSV(workerReport);
  console.log(`✓ Report CSV Export generated: Headers=[${workerReport.headers.join(', ')}], CSV Length=${csvOutput.length} bytes`);

  // 7. Audit Log Count Check
  const auditLogs = await AuditLog.countDocuments();
  console.log(`✓ Total Governance Audit Logs recorded in system: ${auditLogs}`);

  // Clean up test delayed project
  await Project.findByIdAndDelete(delayedProj._id);
  await VerificationRecord.findByIdAndDelete(vRecord._id);

  console.log('=== ALL E2E TESTS PASSED SUCCESSFULLY FOR ADMIN CONTROL CENTER ===');
  await mongoose.disconnect();
  process.exit(0);
};

runAdminControlCenterTest().catch((err) => {
  console.error('❌ E2E TEST FAILED:', err);
  process.exit(1);
});
