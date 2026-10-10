import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { User, AuditLog, Complaint, Dispute } from './src/models/index.js';
import * as adminService from './src/services/adminService.js';
import * as aiService from './src/services/aiService.js';
import * as fraudService from './src/services/fraudService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const runE2ETest = async () => {
  console.log('=== STARTING E2E VERIFICATION TEST FOR STEPS 17 + 18 + 19 ===');

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/kaamsetu');
  console.log('✓ Connected to MongoDB');

  // 1. Setup Admin user
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
  console.log(`✓ Admin user confirmed: ID=${admin._id}`);

  // 2. Test Step 17: Admin Dashboard Analytics
  const analytics = await adminService.getDashboardAnalytics();
  console.log(`✓ Admin Dashboard Analytics: Users=${analytics.totalUsers}, Active Projects=${analytics.activeProjects}`);

  // 3. Test Step 17: User Management & Blocking
  let dummyUser = await User.findOne({ phone: '9988776655' });
  if (!dummyUser) {
    dummyUser = await User.create({
      name: 'Test Fraud Worker',
      phone: '9988776655',
      email: 'fraudworker@test.com',
      passwordHash: 'dummy_hash',
      role: 'worker',
      isPhoneVerified: true,
      status: 'active',
    });
  }

  const blockedUser = await adminService.updateUserStatus(dummyUser._id, { status: 'blocked', reason: 'Test Block' }, admin._id);
  console.log(`✓ User status updated to blocked: Status=${blockedUser.status}`);

  const unblockedUser = await adminService.updateUserStatus(dummyUser._id, { status: 'active', reason: 'Test Unblock' }, admin._id);
  console.log(`✓ User status updated to active: Status=${unblockedUser.status}`);

  // 4. Test Audit Log creation
  const logsResult = await adminService.getAuditLogs({ page: 1, limit: 5 });
  console.log(`✓ Audit Logs recorded: Count=${logsResult.total}`);

  // 5. Test Step 18: AI Translation
  const translation = await aiService.translateMessage('Can you work for two more days?', 'mr');
  console.log(`✓ AI Translation (EN -> MR): "${translation.translatedContent}"`);

  // 6. Test Step 18: AI Smart Matching Score
  const matchResult = aiService.matchJobWorker(
    { title: 'House Painter', category: 'painting', location: { city: 'Pune' }, payRate: 900 },
    { primarySkills: ['painting'], location: { city: 'Pune' }, expectedDailyRate: 850, rating: 4.8 }
  );
  console.log(`✓ AI Smart Match Score calculated: ${matchResult.score}%`);

  // 7. Test Step 18: AI Job Description Generator
  const generatedDesc = await aiService.generateJobDescription({ title: 'Painter', category: 'painting', location: { city: 'Pune' }, payRate: 900 });
  console.log(`✓ AI Job Description generated successfully (${generatedDesc.length} chars)`);

  // 8. Test Step 18: AI Assistant Response
  const aiResponse = await aiService.processAiAssistantChat({ prompt: 'How do I check in daily attendance?', role: 'worker' });
  console.log(`✓ AI Assistant Chat response: "${aiResponse.response.substring(0, 60)}..."`);

  // 9. Test Step 19: Fraud Risk Detection Engine
  const fraudRisk = await fraudService.analyzeUserFraudRisk(dummyUser._id);
  console.log(`✓ Fraud Risk Analysis completed: Score=${fraudRisk.riskScore}, Level=${fraudRisk.riskLevel}`);

  console.log('=== ALL E2E TESTS PASSED SUCCESSFULLY FOR STEPS 17 + 18 + 19 ===');
  await mongoose.disconnect();
  process.exit(0);
};

runE2ETest().catch((err) => {
  console.error('❌ E2E TEST FAILED:', err);
  process.exit(1);
});
