import {
  connectTestDB,
  disconnectTestDB,
  cleanupTrackedData,
  createTestUser,
  tracker,
} from './testHelper.js';
import {
  createConversation,
  sendMessage,
  getMessages,
  markMessageRead,
} from '../src/services/chatService.js';
import {
  createNotification,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../src/services/notificationService.js';
import { createComplaint } from '../src/services/complaintService.js';
import { createDispute } from '../src/services/disputeService.js';
import { Job, Project, ProjectWorker, HiringAgreement } from '../src/models/index.js';
import mongoose from 'mongoose';

export async function runCommunicationSupportTests() {
  console.log('\n========================================');
  console.log('RUNNING SUITE: Communication & Support');
  console.log('========================================');

  let passed = 0;
  let total = 0;

  const assert = (condition, msg) => {
    total++;
    if (condition) {
      console.log(`  ✓ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${msg}`);
      throw new Error(`Assertion failed: ${msg}`);
    }
  };

  try {
    await connectTestDB();

    const { user: worker } = await createTestUser({ name: 'Sanjay Jadhav', role: 'worker' });
    const { user: employer } = await createTestUser({ name: 'Anil Deshmukh', role: 'employer' });
    const { user: stranger } = await createTestUser({ name: 'Stranger User', role: 'worker' });

    // 1. Unrelated users cannot initiate conversation (403)
    let strangerChatRejected = false;
    try {
      await createConversation(
        { id: stranger._id.toString() },
        { recipientId: employer._id.toString() }
      );
    } catch (err) {
      if (err.statusCode === 403) strangerChatRejected = true;
    }
    assert(strangerChatRejected === true, 'Strangers without platform relationship are blocked from messaging (403)');

    // Setup project relationship between worker and employer
    const job = await Job.create({
      employerId: employer._id,
      title: 'Support Test Job',
      description: 'Job for chat & disputes test',
      skillRequired: 'electrician',
      wageAmount: 850,
      startDate: new Date(),
      location: { city: 'Nagpur' },
    });
    tracker.jobs.add(job._id);

    const project = await Project.create({
      jobId: job._id,
      employerId: employer._id,
      createdFromHiringAgreement: new mongoose.Types.ObjectId(),
      name: 'Electrical Rewiring Project',
      durationType: 'single_day',
      paymentType: 'daily',
      paymentAmount: 850,
      startDate: new Date(),
      status: 'in_progress',
    });
    tracker.projects.add(project._id);

    const pw = await ProjectWorker.create({
      projectId: project._id,
      workerId: worker._id,
      hiringAgreementId: new mongoose.Types.ObjectId(),
      startDate: new Date(),
      wageType: 'daily',
      agreedWage: 850,
      status: 'active',
    });
    tracker.projectWorkers.add(pw._id);

    // 2. Valid participants can initiate conversation
    const conversation = await createConversation(
      { id: employer._id.toString() },
      { recipientId: worker._id.toString(), projectId: project._id.toString() }
    );
    tracker.conversations.add(conversation._id);
    assert(
      conversation.participants.some((p) => p._id.toString() === worker._id.toString()),
      'Conversation created between authorized project participants'
    );

    // 3. Message sending and persistence
    const message = await sendMessage(
      { id: employer._id.toString(), name: employer.name },
      conversation._id,
      { content: 'Please bring your insulated wire strippers tomorrow.' }
    );
    tracker.messages.add(message._id);
    assert(message.content.includes('wire strippers'), 'Message content saved and persisted');

    // 4. Message retrieval
    const messages = await getMessages(
      { id: worker._id.toString() },
      conversation._id
    );
    assert(messages.length >= 1, 'Participant can retrieve conversation messages');

    // 4b. Message read status update
    const readMsg = await markMessageRead(
      { id: worker._id.toString() },
      message._id
    );
    assert(Boolean(readMsg.readAt), 'Message read status marked accurately');

    // 5. Notifications creation, recipient accuracy & unread counts
    const notification = await createNotification({
      userId: worker._id,
      type: 'SYSTEM',
      title: 'Project Location Shift',
      message: 'Reporting location updated to Gate 2.',
    });
    tracker.notifications.add(notification._id);
    assert(notification.userId.toString() === worker._id.toString(), 'Notification routed to correct recipient');

    const unreadCount = await getUnreadCount(worker._id);
    assert(unreadCount >= 1, 'Unread notification count tracks accurately');

    await markAsRead(worker._id, notification._id);
    const unreadAfter = await getUnreadCount(worker._id);
    assert(unreadAfter === unreadCount - 1, 'Mark as read decrements unread notification count');

    // 6. Complaint creation
    const complaint = await createComplaint(
      { id: worker._id.toString() },
      {
        targetUserId: employer._id.toString(),
        projectId: project._id.toString(),
        category: 'safety',
        description: 'No protective gloves or masks provided on site.',
      }
    );
    tracker.complaints.add(complaint._id);
    assert(complaint.status === 'new' && complaint.category === 'safety', 'Complaint created in new status');

    // 7. Self-complaint prevention (Must throw 400)
    let selfComplaintRejected = false;
    try {
      await createComplaint(
        { id: worker._id.toString() },
        { targetUserId: worker._id.toString(), category: 'safety', description: 'Testing self complaint' }
      );
    } catch (err) {
      if (err.statusCode === 400) selfComplaintRejected = true;
    }
    assert(selfComplaintRejected === true, 'Cannot create complaint against oneself (400)');

    // 8. Dispute creation with project participant validation
    const dispute = await createDispute(
      { id: employer._id.toString() },
      {
        projectId: project._id.toString(),
        againstUserId: worker._id.toString(),
        type: 'work_quality',
        amount: 500,
        description: 'Improper connection left loose in main switchboard.',
      }
    );
    tracker.disputes.add(dispute._id);
    assert(dispute.status === 'open' && dispute.type === 'work_quality', 'Dispute opened between project participants');

    // 9. Unauthorized stranger cannot initiate dispute on another project
    let strangerDisputeRejected = false;
    try {
      await createDispute(
        { id: stranger._id.toString() },
        {
          projectId: project._id.toString(),
          againstUserId: worker._id.toString(),
          type: 'other',
          description: 'Stranger trying to dispute',
        }
      );
    } catch (err) {
      if (err.statusCode === 403) strangerDisputeRejected = true;
    }
    assert(strangerDisputeRejected === true, 'Non-project participant cannot initiate dispute (403)');

    console.log(`\nSUITE PASSED: ${passed}/${total} assertions succeeded.\n`);
    return { passed, total };
  } finally {
    await cleanupTrackedData();
  }
}

if (process.argv[1]?.endsWith('communication-support.test.js')) {
  runCommunicationSupportTests()
    .then(() => disconnectTestDB())
    .catch((err) => {
      console.error(err);
      disconnectTestDB().then(() => process.exit(1));
    });
}
