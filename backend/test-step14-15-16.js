import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { connectDB } from './src/config/db.js';
import {
  User,
  WorkerProfile,
  EmployerProfile,
  Job,
  HiringAgreement,
  Project,
  ProjectWorker,
  Conversation,
  Message,
  Notification,
  Complaint,
  Dispute,
} from './src/models/index.js';
import * as chatService from './src/services/chatService.js';
import * as notificationService from './src/services/notificationService.js';
import * as complaintService from './src/services/complaintService.js';
import * as disputeService from './src/services/disputeService.js';
import * as projectService from './src/services/projectService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const runTests = async () => {
  console.log('=== STARTING E2E VERIFICATION TEST FOR STEPS 14 + 15 + 16 ===');
  await connectDB();

  try {
    const timestamp = Date.now();

    // 1. Create Test Users & Profiles
    const employerUser = await User.create({
      name: 'Employer Chat E2E',
      phone: `91${timestamp.toString().slice(-8)}`,
      role: 'employer',
      isVerified: true,
    });
    const workerUser = await User.create({
      name: 'Worker Chat E2E',
      phone: `81${timestamp.toString().slice(-8)}`,
      role: 'worker',
      isVerified: true,
    });
    const unauthWorker = await User.create({
      name: 'Unauth Worker E2E',
      phone: `71${timestamp.toString().slice(-8)}`,
      role: 'worker',
      isVerified: true,
    });

    await EmployerProfile.create({
      userId: employerUser._id,
      name: employerUser.name,
      businessName: 'Chat Builders',
      location: { city: 'Mumbai', area: 'Bandra' },
    });

    await WorkerProfile.create({
      userId: workerUser._id,
      fullName: workerUser.name,
      primarySkill: 'mason',
      dailyWage: 800,
      location: { city: 'Mumbai', area: 'Bandra' },
    });

    const empAuth = { id: employerUser._id.toString(), role: 'employer', name: employerUser.name };
    const wrkAuth = { id: workerUser._id.toString(), role: 'worker', name: workerUser.name };
    const unauthAuth = { id: unauthWorker._id.toString(), role: 'worker', name: unauthWorker.name };

    console.log('✓ Users and profiles created');

    // 2. Create Job & Project to establish Platform Relationship
    const job = await Job.create({
      employerId: employerUser._id,
      title: 'Masonry Construction Project',
      category: 'masonry',
      skillRequired: 'masonry',
      description: 'Brick masonry wall building',
      location: { city: 'Mumbai', area: 'Bandra' },
      wageAmount: 850,
      wageType: 'daily',
      durationType: 'fixed_duration',
      durationDays: 3,
      startDate: new Date(),
      workersNeeded: 1,
    });

    const agreement = await HiringAgreement.create({
      jobId: job._id,
      employerId: employerUser._id,
      workerId: workerUser._id,
      sourceType: 'application',
      sourceId: new mongoose.Types.ObjectId(),
      agreedWage: 850,
      proposedWage: 850,
      wageType: 'daily',
      durationType: 'fixed_duration',
      startDate: new Date(),
      estimatedEndDate: new Date(Date.now() + 86400000 * 3),
      status: 'confirmed',
      agreedAt: new Date(),
    });

    const { project } = await projectService.createFromConfirmedAgreement(employerUser._id, agreement._id);
    console.log(`✓ Project established for chat testing: ${project._id}`);

    // 3. Test Chat System
    // Test unauthorized conversation creation (unrelated worker)
    try {
      await chatService.createConversation(unauthAuth, {
        recipientId: employerUser._id.toString(),
        projectId: project._id.toString(),
      });
      throw new Error('FAIL: Unauthorized conversation creation allowed!');
    } catch (err) {
      if (err.statusCode === 403) {
        console.log('✓ Verified 403 Forbidden for unauthorized user chat creation');
      } else {
        throw err;
      }
    }

    // Create valid conversation between Worker & Employer
    const conversation = await chatService.createConversation(wrkAuth, {
      recipientId: employerUser._id.toString(),
      projectId: project._id.toString(),
      conversationType: 'project',
    });
    console.log(`✓ Conversation created: ID=${conversation._id}`);

    // Worker sends message
    const msg1 = await chatService.sendMessage(wrkAuth, conversation._id.toString(), {
      content: 'Hello employer, I will arrive at 9 AM tomorrow for brickwork.',
    });
    console.log(`✓ Worker sent message: "${msg1.content.substring(0, 30)}..."`);

    // Employer reads messages
    const messages = await chatService.getMessages(empAuth, conversation._id.toString());
    if (messages.length !== 1 || messages[0].content !== msg1.content) {
      throw new Error('FAIL: Message retrieval mismatch');
    }
    console.log('✓ Employer retrieved chat messages successfully');

    // Employer marks message read
    await chatService.markMessageRead(empAuth, msg1._id.toString());
    console.log('✓ Message marked as read');

    // 4. Test Notification System
    const empNotifications = await notificationService.getUserNotifications(employerUser._id.toString());
    if (empNotifications.length === 0 || empNotifications[0].type !== 'NEW_MESSAGE') {
      throw new Error('FAIL: In-app chat notification not created');
    }
    console.log(`✓ In-App Notification created for Employer: "${empNotifications[0].title}"`);

    const unreadCount = await notificationService.getUnreadCount(employerUser._id.toString());
    console.log(`✓ Employer Unread Notification Count: ${unreadCount}`);

    await notificationService.markAllAsRead(employerUser._id.toString());
    const unreadCountAfter = await notificationService.getUnreadCount(employerUser._id.toString());
    if (unreadCountAfter !== 0) throw new Error('FAIL: markAllAsRead failed');
    console.log('✓ All notifications marked as read');

    // 5. Test Complaint Management
    // Self-reporting complaint attempt (must fail)
    try {
      await complaintService.createComplaint(wrkAuth, {
        targetUserId: workerUser._id.toString(),
        category: 'payment',
        description: 'Self reporting test complaint',
      });
      throw new Error('FAIL: Self reporting complaint allowed!');
    } catch (err) {
      if (err.statusCode === 400) {
        console.log('✓ Verified 400 Bad Request for self-targeting complaint');
      } else {
        throw err;
      }
    }

    // Valid Worker complaint against Employer
    const complaint = await complaintService.createComplaint(wrkAuth, {
      targetUserId: employerUser._id.toString(),
      projectId: project._id.toString(),
      category: 'payment',
      priority: 'high',
      description: 'Employer delayed payment entry for 2 consecutive days.',
    });

    console.log(`✓ Complaint created: Category=${complaint.category}, Priority=${complaint.priority}, Status=${complaint.status}`);

    const myComplaints = await complaintService.getMyComplaints(wrkAuth);
    if (myComplaints.length === 0) throw new Error('FAIL: getMyComplaints returned empty');
    console.log(`✓ Verified worker complaints list (${myComplaints.length} records)`);

    // 6. Test Dispute Management
    // Non-participant dispute attempt (must fail)
    try {
      await disputeService.createDispute(unauthAuth, {
        projectId: project._id.toString(),
        againstUserId: employerUser._id.toString(),
        type: 'payment',
        description: 'Unauth dispute test',
      });
      throw new Error('FAIL: Non-participant dispute allowed!');
    } catch (err) {
      if (err.statusCode === 403) {
        console.log('✓ Verified 403 Forbidden for non-participant dispute');
      } else {
        throw err;
      }
    }

    // Valid Dispute initiated by Worker
    const dispute = await disputeService.createDispute(wrkAuth, {
      projectId: project._id.toString(),
      againstUserId: employerUser._id.toString(),
      type: 'payment',
      amount: 850,
      description: 'Dispute filed regarding unpaid daily wage for masonry work on Day 1.',
    });

    console.log(`✓ Dispute created: Type=${dispute.type}, Amount=₹${dispute.amount}, Status=${dispute.status}`);

    const myDisputes = await disputeService.getMyDisputes(empAuth);
    if (myDisputes.length === 0) throw new Error('FAIL: getMyDisputes returned empty for employer');
    console.log(`✓ Verified employer disputes list (${myDisputes.length} records)`);

    console.log('=== ALL E2E TESTS PASSED SUCCESSFULLY FOR STEPS 14 + 15 + 16 ===');
  } catch (error) {
    console.error('❌ E2E TEST FAILED:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

runTests();
