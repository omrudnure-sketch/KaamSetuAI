import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as models from '../src/models/index.js';
import { getHealthStatus, getReadinessStatus } from '../src/controllers/health.controller.js';
import { validateReviewInput } from '../src/validators/reviewValidator.js';
import { validatePaymentInput } from '../src/validators/paymentValidator.js';
import { validateConversationInput, validateSendMessageInput } from '../src/validators/chatValidator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.resolve(__dirname, '../src');

export async function runDatabaseMigrationTests() {
  console.log('\n========================================');
  console.log('RUNNING SUITE: Database Migration & Regression');
  console.log('========================================');

  let passed = 0;
  let total = 0;

  const assert = (condition, msg) => {
    total++;
    if (condition) {
      passed++;
      console.log(`  [PASS] ${msg}`);
    } else {
      console.error(`  [FAIL] ${msg}`);
    }
  };

  // 1. REGRESSION CHECK: Verify no runtime code in src/ contains mongoose connect or mongodb fallback
  function getAllJsFiles(dir) {
    let results = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results = results.concat(getAllJsFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        results.push(fullPath);
      }
    }
    return results;
  }

  const jsFiles = getAllJsFiles(SRC_DIR);
  let filesWithMongooseImport = [];
  let filesWithMongoConnect = [];
  let filesWithMongoFallback = [];

  for (const file of jsFiles) {
    const relPath = path.relative(SRC_DIR, file).replace(/\\/g, '/');
    const content = fs.readFileSync(file, 'utf-8');

    // Check for active mongoose import
    if (/import\s+.*from\s+['"]mongoose['"]/.test(content)) {
      filesWithMongooseImport.push(relPath);
    }

    // Check for mongoose.connect calls
    if (/mongoose\.connect/.test(content)) {
      filesWithMongoConnect.push(relPath);
    }

    // Check for mongodb local fallback connection strings
    if (/mongodb:\/\//.test(content) || /127\.0\.0\.1:27017/.test(content)) {
      filesWithMongoFallback.push(relPath);
    }
  }

  assert(
    filesWithMongooseImport.length === 0,
    `Zero runtime files import mongoose (Violations: ${filesWithMongooseImport.join(', ') || 'None'})`
  );

  assert(
    filesWithMongoConnect.length === 0,
    `Zero runtime files call mongoose.connect (Violations: ${filesWithMongoConnect.join(', ') || 'None'})`
  );

  assert(
    filesWithMongoFallback.length === 0,
    `Zero runtime files contain mongodb:// or local fallback URI (Violations: ${filesWithMongoFallback.join(', ') || 'None'})`
  );

  // 2. MODEL LAYER: Verify all 23 models are registered and provide Supabase query API
  const expectedModelNames = [
    'User',
    'WorkerProfile',
    'EmployerProfile',
    'Job',
    'JobApplication',
    'JobInvitation',
    'HiringAgreement',
    'Project',
    'ProjectWorker',
    'Attendance',
    'ProgressUpdate',
    'ProjectExtension',
    'Payment',
    'Review',
    'Conversation',
    'Message',
    'Notification',
    'Complaint',
    'Dispute',
    'AuditLog',
    'VerificationRecord',
    'AdminAssistantConversation',
    'RiskFlag',
  ];

  let allModelsExported = true;
  for (const name of expectedModelNames) {
    const model = models[name];
    if (!model || typeof model.find !== 'function' || typeof model.create !== 'function') {
      allModelsExported = false;
      console.error(`  Missing or invalid model interface for: ${name}`);
    }
  }
  assert(allModelsExported, 'All 23 platform models export compatible Supabase data-access interfaces');

  // 3. CRUD & QUERY COMPATIBILITY: Verify in-memory and query builder operations
  const testUser = await models.User.create({
    name: 'Migration Test User',
    email: `mig_test_${Date.now()}@example.com`,
    phone: '9998887776',
    passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
    role: 'worker',
    status: 'active',
  });
  assert(testUser && testUser._id && testUser.id, 'Supabase model generates dual id / _id accessors');

  const foundUser = await models.User.findById(testUser._id);
  assert(foundUser && foundUser.email === testUser.email, 'Model findById retrieves record correctly');

  const queriedUsers = await models.User.find({ email: testUser.email }).sort({ createdAt: -1 }).lean();
  assert(queriedUsers.length >= 1, 'Model find() chainable with sort() and lean()');

  // Clean up test user
  await models.User.deleteMany({ email: testUser.email });

  // 4. HEALTH CONTROLLER: Verify readiness check does not reference MongoDB
  let mockResStatus = 0;
  let mockResBody = null;
  const mockRes = {
    status(code) {
      mockResStatus = code;
      return this;
    },
    json(body) {
      mockResBody = body;
      return this;
    },
  };

  await getReadinessStatus({}, mockRes);
  assert(
    mockResStatus === 200 || mockResStatus === 503,
    `Readiness controller responds with standard status code (${mockResStatus})`
  );
  if (mockResBody?.services?.engine) {
    assert(
      mockResBody.services.engine !== 'mongodb',
      `Readiness service engine does NOT report mongodb (Reported: ${mockResBody.services.engine})`
    );
  }

  // 5. VALIDATOR ID ACCEPTANCE: Verify validators accept both UUIDs and 24-char hex IDs
  const uuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const legacyId = '507f1f77bcf86cd799439011';

  const reviewResultUUID = validateReviewInput({
    revieweeId: uuid,
    rating: 5,
    comment: 'Great work',
  });
  assert(reviewResultUUID.isValid, 'Review validator accepts Supabase UUID format');

  const reviewResultLegacy = validateReviewInput({
    revieweeId: legacyId,
    rating: 4,
    comment: 'Good',
  });
  assert(reviewResultLegacy.isValid, 'Review validator accepts legacy 24-character hexadecimal ID');

  console.log(`\nDatabase Migration Suite completed: ${passed}/${total} passed`);
  if (passed !== total) {
    process.exit(1);
  }
  return { passed, total };
}

if (process.argv[1]?.endsWith('database-migration.test.js')) {
  runDatabaseMigrationTests().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
