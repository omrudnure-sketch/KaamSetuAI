import {
  connectTestDB,
  createTestUser,
} from './testHelper.js';
import {
  sendChatRequest,
  respondToChatRequest,
  getPendingChatRequests,
  getUserConversations,
  sendMessage,
  getMessages,
  markMessageRead,
} from '../src/services/chatService.js';
import { getUserNotifications } from '../src/services/notificationService.js';

export async function runWhatsAppMessagingTests() {
  console.log('\n========================================');
  console.log('RUNNING SUITE: WhatsApp-Style Messaging & Chat Requests');
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

    // 1. Create independent worker and employer (NO prior agreement, application or project)
    const { user: worker } = await createTestUser({ name: 'Kavita Shinde', role: 'worker' });
    const { user: employer } = await createTestUser({ name: 'Vikram Joshi', role: 'employer' });
    const { user: strangerWorker } = await createTestUser({ name: 'Third Party', role: 'worker' });

    console.log('--- 1. Pre-Agreement Chat Request Initiation ---');
    // Employer initiates chat request to worker before hiring agreement
    const requestConv = await sendChatRequest(
      { id: employer._id.toString(), name: employer.name, role: employer.role },
      {
        recipientId: worker._id.toString(),
        initialMessage: 'Hi Kavita, we need a painter for a 3-day project in Pune. Are you available?',
      }
    );

    assert(requestConv !== null, 'Chat request created successfully without prior agreement');
    assert(requestConv.status === 'pending', 'Conversation status is pending approval');
    assert(requestConv.initiatedBy.toString() === employer._id.toString(), 'Initiator is correctly recorded as employer');

    // Verify in-app notification delivered to worker
    const workerNotifications = await getUserNotifications(worker._id.toString());
    const chatReqNotif = workerNotifications.find((n) => n.type === 'CHAT_REQUEST');
    assert(chatReqNotif !== undefined, 'Worker received in-app notification for incoming chat request');
    assert(chatReqNotif.message.includes('Vikram Joshi'), 'Notification specifies employer name');

    // 2. Pending Chat Requests Query
    console.log('--- 2. Retrieve Pending Chat Requests ---');
    const workerRequests = await getPendingChatRequests({ id: worker._id.toString() });
    assert(workerRequests.incoming.length >= 1, 'Worker sees incoming pending request');
    assert(workerRequests.outgoing.length === 0, 'Worker has zero outgoing requests');

    const employerRequests = await getPendingChatRequests({ id: employer._id.toString() });
    assert(employerRequests.outgoing.length >= 1, 'Employer sees outgoing pending request');
    assert(employerRequests.incoming.length === 0, 'Employer has zero incoming requests');

    // 3. Unauthorized Messaging Guard: Cannot send messages while pending
    console.log('--- 3. Messaging Guard on Pending Status ---');
    let msgBeforeAcceptBlocked = false;
    try {
      await sendMessage(
        { id: employer._id.toString(), name: employer.name },
        requestConv._id.toString(),
        { content: 'Are you there?' }
      );
    } catch (err) {
      if (err.statusCode === 403) msgBeforeAcceptBlocked = true;
    }
    assert(msgBeforeAcceptBlocked === true, 'Sending messages before acceptance is strictly blocked (403)');

    // 4. Initiator cannot accept their own request
    let selfAcceptBlocked = false;
    try {
      await respondToChatRequest(
        { id: employer._id.toString(), name: employer.name },
        requestConv._id.toString(),
        'accept'
      );
    } catch (err) {
      if (err.statusCode === 403) selfAcceptBlocked = true;
    }
    assert(selfAcceptBlocked === true, 'Initiator is forbidden from accepting their own request (403)');

    // 5. Worker Accepts Chat Request
    console.log('--- 4. Worker Accepts Chat Request ---');
    const acceptedConv = await respondToChatRequest(
      { id: worker._id.toString(), name: worker.name },
      requestConv._id.toString(),
      'accept'
    );
    assert(acceptedConv.status === 'accepted', 'Conversation transitioned to accepted status');
    assert(acceptedConv.acceptedAt !== null, 'Accepted timestamp recorded');

    // Verify notification delivered to employer
    const employerNotifications = await getUserNotifications(employer._id.toString());
    const acceptNotif = employerNotifications.find((n) => n.type === 'CHAT_REQUEST_ACCEPTED');
    assert(acceptNotif !== undefined, 'Employer notified that worker accepted the chat request');

    // 6. Communication enabled: Text, Image, Audio
    console.log('--- 5. Pre-Agreement Communication Active ---');
    // Employer sends text message
    const msg1 = await sendMessage(
      { id: employer._id.toString(), name: employer.name },
      requestConv._id.toString(),
      { messageType: 'text', content: 'Great to connect! Can you start tomorrow morning at 9 AM?' }
    );
    assert(msg1._id !== undefined, 'Employer sent text message successfully');
    assert(msg1.messageType === 'text', 'Message type is text');

    // Worker replies with text
    const msg2 = await sendMessage(
      { id: worker._id.toString(), name: worker.name },
      requestConv._id.toString(),
      { messageType: 'text', content: 'Yes sir, I am available tomorrow. Please share site photos.' }
    );
    assert(msg2._id !== undefined, 'Worker replied with text message');

    // Employer sends image attachment
    const imgMsg = await sendMessage(
      { id: employer._id.toString(), name: employer.name },
      requestConv._id.toString(),
      {
        messageType: 'image',
        content: 'Here is the exterior wall area to be painted',
        attachmentUrl: '/uploads/chat/images/img-test-wall.jpg',
        attachmentName: 'exterior-wall.jpg',
        attachmentSize: 2048500,
      }
    );
    assert(imgMsg.messageType === 'image', 'Image message delivered successfully');
    assert(imgMsg.attachmentUrl === '/uploads/chat/images/img-test-wall.jpg', 'Image attachment URL saved');

    // Worker replies with voice note / audio message
    const audioMsg = await sendMessage(
      { id: worker._id.toString(), name: worker.name },
      requestConv._id.toString(),
      {
        messageType: 'audio',
        content: 'Voice note (0:12)',
        attachmentUrl: '/uploads/chat/audio/audio-test-voicenote.webm',
        attachmentName: 'voicenote.webm',
        attachmentSize: 98000,
        duration: 12,
      }
    );
    assert(audioMsg.messageType === 'audio', 'Voice note audio message delivered successfully');
    assert(audioMsg.duration === 12, 'Audio note duration (12s) preserved');

    // 7. Message Retrieval & Read Status
    console.log('--- 6. Message Stream & Read Receipts ---');
    const conversationMessages = await getMessages(
      { id: worker._id.toString(), name: worker.name },
      requestConv._id.toString()
    );
    assert(conversationMessages.length >= 4, 'Participant retrieved all exchanged messages');

    // Mark as read
    const readReceipt = await markMessageRead(
      { id: worker._id.toString() },
      imgMsg._id.toString()
    );
    assert(readReceipt.isRead === true, 'Message marked as read with timestamp');
    assert(readReceipt.readAt !== null, 'Read timestamp recorded for double-tick receipt');

    // 8. Rejection Flow Test
    console.log('--- 7. Worker to Employer Request & Rejection Flow ---');
    const { user: emp2 } = await createTestUser({ name: 'Rajesh Contractor', role: 'employer' });
    const req2 = await sendChatRequest(
      { id: worker._id.toString(), name: worker.name, role: worker.role },
      { recipientId: emp2._id.toString(), initialMessage: 'Looking for carpentry work' }
    );
    assert(req2.status === 'pending', 'Worker sent chat request to Employer 2');

    // Employer 2 rejects
    const rejectedConv = await respondToChatRequest(
      { id: emp2._id.toString(), name: emp2.name },
      req2._id.toString(),
      'reject'
    );
    assert(rejectedConv.status === 'rejected', 'Employer rejected chat request');

    // Verify messages cannot be sent in rejected conversation
    let rejectedMsgBlocked = false;
    try {
      await sendMessage(
        { id: worker._id.toString(), name: worker.name },
        rejectedConv._id.toString(),
        { content: 'Hello?' }
      );
    } catch (err) {
      if (err.statusCode === 403) rejectedMsgBlocked = true;
    }
    assert(rejectedMsgBlocked === true, 'Sending message to rejected conversation is blocked (403)');

    // 9. Unauthorized outsider denied access
    console.log('--- 8. Security Isolation Guard ---');
    let outsiderBlocked = false;
    try {
      await getMessages(
        { id: strangerWorker._id.toString(), name: strangerWorker.name },
        requestConv._id.toString()
      );
    } catch (err) {
      if (err.statusCode === 403) outsiderBlocked = true;
    }
    assert(outsiderBlocked === true, 'Outsider denied access to private conversation messages (403)');

    console.log('\n======================================================');
    console.log(`WHATSAPP MESSAGING SUITE PASSED: ${passed}/${total} assertions succeeded.`);
    console.log('======================================================\n');
  } catch (err) {
    console.error('Test Suite Failed:', err);
    throw err;
  }
}

if (process.argv[1] && process.argv[1].endsWith('whatsapp-style-messaging.test.js')) {
  runWhatsAppMessagingTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
