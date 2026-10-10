import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  User,
  WorkerProfile,
  EmployerProfile,
  Job,
  JobApplication,
  JobInvitation,
  HiringAgreement,
  Project,
  ProjectWorker,
  Attendance,
  ProgressUpdate,
  ProjectExtension,
  Payment,
  Review,
  Conversation,
  Message,
  Notification,
  Complaint,
  Dispute,
  AuditLog,
  VerificationRecord,
  RiskFlag,
} from '../src/models/index.js';
import { generateAccessToken, hashPassword } from '../src/services/authService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  'mongodb://127.0.0.1:27017/kaamsetu_ai';

// Safe cleanup registry: Only tracks IDs explicitly created during test executions
export const tracker = {
  users: new Set(),
  workerProfiles: new Set(),
  employerProfiles: new Set(),
  jobs: new Set(),
  applications: new Set(),
  invitations: new Set(),
  agreements: new Set(),
  projects: new Set(),
  projectWorkers: new Set(),
  attendances: new Set(),
  progressUpdates: new Set(),
  extensions: new Set(),
  payments: new Set(),
  reviews: new Set(),
  conversations: new Set(),
  messages: new Set(),
  notifications: new Set(),
  complaints: new Set(),
  disputes: new Set(),
  auditLogs: new Set(),
  verifications: new Set(),
  riskFlags: new Set(),
};

export async function connectTestDB() {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(MONGO_URI);
  }
}

export async function disconnectTestDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

export async function cleanupTrackedData() {
  try {
    if (tracker.riskFlags.size > 0) {
      await RiskFlag.deleteMany({ _id: { $in: Array.from(tracker.riskFlags) } });
      tracker.riskFlags.clear();
    }
    if (tracker.verifications.size > 0) {
      await VerificationRecord.deleteMany({ _id: { $in: Array.from(tracker.verifications) } });
      tracker.verifications.clear();
    }
    if (tracker.auditLogs.size > 0) {
      await AuditLog.deleteMany({ _id: { $in: Array.from(tracker.auditLogs) } });
      tracker.auditLogs.clear();
    }
    if (tracker.disputes.size > 0) {
      await Dispute.deleteMany({ _id: { $in: Array.from(tracker.disputes) } });
      tracker.disputes.clear();
    }
    if (tracker.complaints.size > 0) {
      await Complaint.deleteMany({ _id: { $in: Array.from(tracker.complaints) } });
      tracker.complaints.clear();
    }
    if (tracker.notifications.size > 0) {
      await Notification.deleteMany({ _id: { $in: Array.from(tracker.notifications) } });
      tracker.notifications.clear();
    }
    if (tracker.messages.size > 0) {
      await Message.deleteMany({ _id: { $in: Array.from(tracker.messages) } });
      tracker.messages.clear();
    }
    if (tracker.conversations.size > 0) {
      await Conversation.deleteMany({ _id: { $in: Array.from(tracker.conversations) } });
      tracker.conversations.clear();
    }
    if (tracker.reviews.size > 0) {
      await Review.deleteMany({ _id: { $in: Array.from(tracker.reviews) } });
      tracker.reviews.clear();
    }
    if (tracker.payments.size > 0) {
      await Payment.deleteMany({ _id: { $in: Array.from(tracker.payments) } });
      tracker.payments.clear();
    }
    if (tracker.extensions.size > 0) {
      await ProjectExtension.deleteMany({ _id: { $in: Array.from(tracker.extensions) } });
      tracker.extensions.clear();
    }
    if (tracker.progressUpdates.size > 0) {
      await ProgressUpdate.deleteMany({ _id: { $in: Array.from(tracker.progressUpdates) } });
      tracker.progressUpdates.clear();
    }
    if (tracker.attendances.size > 0) {
      await Attendance.deleteMany({ _id: { $in: Array.from(tracker.attendances) } });
      tracker.attendances.clear();
    }
    if (tracker.projectWorkers.size > 0) {
      await ProjectWorker.deleteMany({ _id: { $in: Array.from(tracker.projectWorkers) } });
      tracker.projectWorkers.clear();
    }
    if (tracker.projects.size > 0) {
      await Project.deleteMany({ _id: { $in: Array.from(tracker.projects) } });
      tracker.projects.clear();
    }
    if (tracker.agreements.size > 0) {
      await HiringAgreement.deleteMany({ _id: { $in: Array.from(tracker.agreements) } });
      tracker.agreements.clear();
    }
    if (tracker.invitations.size > 0) {
      await JobInvitation.deleteMany({ _id: { $in: Array.from(tracker.invitations) } });
      tracker.invitations.clear();
    }
    if (tracker.applications.size > 0) {
      await JobApplication.deleteMany({ _id: { $in: Array.from(tracker.applications) } });
      tracker.applications.clear();
    }
    if (tracker.jobs.size > 0) {
      await Job.deleteMany({ _id: { $in: Array.from(tracker.jobs) } });
      tracker.jobs.clear();
    }
    if (tracker.employerProfiles.size > 0) {
      await EmployerProfile.deleteMany({ _id: { $in: Array.from(tracker.employerProfiles) } });
      tracker.employerProfiles.clear();
    }
    if (tracker.workerProfiles.size > 0) {
      await WorkerProfile.deleteMany({ _id: { $in: Array.from(tracker.workerProfiles) } });
      tracker.workerProfiles.clear();
    }
    if (tracker.users.size > 0) {
      await User.deleteMany({ _id: { $in: Array.from(tracker.users) } });
      tracker.users.clear();
    }
  } catch (err) {
    console.warn('[Test Cleanup Warning]:', err.message);
  }
}

export async function createTestUser({
  name = 'Test User',
  email = null,
  phone = null,
  role = 'worker',
  adminRole = null,
  permissions = [],
  status = 'active',
  isVerified = true,
  preferredLanguage = 'en',
  password = 'Password123!',
} = {}) {
  const ts = Date.now() + Math.floor(Math.random() * 10000);
  const userEmail = email || `user_${ts}@example.com`;
  const userPhone = phone || `98${String(ts).slice(-8)}`;
  const passwordHash = await hashPassword(password);

  const user = await User.create({
    name,
    email: userEmail,
    phone: userPhone,
    role,
    adminRole,
    permissions,
    status,
    isVerified,
    preferredLanguage,
    passwordHash,
  });

  tracker.users.add(user._id);
  const token = generateAccessToken(user);

  return { user, token };
}

export default {
  connectTestDB,
  disconnectTestDB,
  cleanupTrackedData,
  createTestUser,
  tracker,
};
