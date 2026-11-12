import {
  Conversation,
  Message,
  Project,
  ProjectWorker,
  Job,
  JobApplication,
  JobInvitation,
  HiringAgreement,
  User,
} from '../models/index.js';
import { createNotification } from './notificationService.js';
import { getIO } from '../socket/socketManager.js';

export const validatePlatformRelationship = async (user1Id, user2Id, projectId = null, jobId = null) => {
  if (user1Id.toString() === user2Id.toString()) return false;

  if (projectId) {
    const project = await Project.findById(projectId);
    if (project) {
      const empId = (project.employerId?._id || project.employerId?.id || project.employerId)?.toString();
      const isEmp = empId === user1Id.toString() || empId === user2Id.toString();
      const hasWorker1 = await ProjectWorker.exists({ projectId, workerId: user1Id });
      const hasWorker2 = await ProjectWorker.exists({ projectId, workerId: user2Id });
      if (isEmp && (hasWorker1 || hasWorker2)) return true;
      if (hasWorker1 && hasWorker2) return true;
    }
  }

  if (jobId) {
    const job = await Job.findById(jobId);
    if (job) {
      const jobEmpId = (job.employerId?._id || job.employerId?.id || job.employerId)?.toString();
      const isEmp = jobEmpId === user1Id.toString() || jobEmpId === user2Id.toString();
      const otherUser = isEmp ? (jobEmpId === user1Id.toString() ? user2Id : user1Id) : null;
      if (otherUser) {
        const hasApp = await JobApplication.exists({ jobId, workerId: otherUser });
        const hasInv = await JobInvitation.exists({ jobId, workerId: otherUser });
        const hasAgr = await HiringAgreement.exists({ jobId, workerId: otherUser });
        if (hasApp || hasInv || hasAgr) return true;
      }
    }
  }

  // General check across agreements, applications, invitations
  const agreement = await HiringAgreement.findOne({
    $or: [
      { employerId: user1Id, workerId: user2Id },
      { employerId: user2Id, workerId: user1Id },
    ],
  });
  if (agreement) return true;

  const app = await JobApplication.findOne({
    $or: [
      { employerId: user1Id, workerId: user2Id },
      { employerId: user2Id, workerId: user1Id },
    ],
  });
  if (app) return true;

  const inv = await JobInvitation.findOne({
    $or: [
      { employerId: user1Id, workerId: user2Id },
      { employerId: user2Id, workerId: user1Id },
    ],
  });
  if (inv) return true;

  return false;
};

// Legacy direct conversation creation (requires platform relationship)
export const createConversation = async (user, inputData) => {
  const { recipientId, projectId, jobId, conversationType } = inputData;

  const hasRelationship = await validatePlatformRelationship(user.id, recipientId, projectId, jobId);
  if (!hasRelationship) {
    const error = new Error('No valid platform relationship exists between participants');
    error.statusCode = 403;
    throw error;
  }

  let query = {
    participants: { $all: [user.id, recipientId] },
  };
  if (projectId) query.projectId = projectId;
  if (jobId) query.jobId = jobId;

  let conversation = await Conversation.findOne(query);

  if (!conversation) {
    conversation = new Conversation({
      participants: [user.id, recipientId],
      participantA: user.id,
      participantB: recipientId,
      projectId: projectId || null,
      jobId: jobId || null,
      conversationType: conversationType || (projectId ? 'project' : jobId ? 'job' : 'support'),
      status: 'accepted',
    });
    await conversation.save();
  }

  return await conversation.populate([
    { path: 'participants', select: 'name role email phone' },
    { path: 'projectId', select: 'name status' },
    { path: 'jobId', select: 'title' },
  ]);
};

// Pre-Agreement Chat Request: Workers & Employers can initiate chat requests
export const sendChatRequest = async (user, inputData) => {
  const { recipientId, initialMessage, jobId, projectId } = inputData;

  if (user.id.toString() === recipientId.toString()) {
    const error = new Error('Cannot initiate a chat request with yourself');
    error.statusCode = 400;
    throw error;
  }

  const recipient = await User.findById(recipientId);
  if (!recipient) {
    const error = new Error('Recipient user not found');
    error.statusCode = 404;
    throw error;
  }

  // Look for any existing conversation between user and recipient
  let conversation = await Conversation.findOne({
    participants: { $all: [user.id, recipientId] },
  });

  const requestNote = (initialMessage || 'Hello, I would like to connect with you on KaamSetu AI.').trim();

  if (conversation) {
    // If conversation is already accepted or active, return it directly
    if (conversation.status === 'accepted' || conversation.status === 'active') {
      return await conversation.populate([
        { path: 'participants', select: 'name role email phone' },
        { path: 'projectId', select: 'name status' },
        { path: 'jobId', select: 'title' },
      ]);
    }

    // If pending and current user is initiator: notify already pending
    const currentInitiatorId = (conversation.initiatedBy?._id || conversation.initiatedBy?.id || conversation.initiatedBy)?.toString();
    if (conversation.status === 'pending') {
      if (currentInitiatorId === user.id.toString()) {
        const error = new Error('A chat request with this user is already pending response');
        error.statusCode = 409;
        throw error;
      } else {
        // Other user sent a request previously: auto-accept since both want to communicate!
        conversation.status = 'accepted';
        conversation.acceptedAt = new Date().toISOString();
        await conversation.save();

        // Notify other user that request was accepted
        await createNotification({
          userId: currentInitiatorId,
          type: 'CHAT_REQUEST_ACCEPTED',
          title: 'Chat Request Accepted',
          message: `${user.name || 'User'} accepted your chat request. You can now chat!`,
          data: { conversationId: conversation._id.toString() },
          relatedEntityType: 'Conversation',
          relatedEntityId: conversation._id,
        });

        return await conversation.populate([
          { path: 'participants', select: 'name role email phone' },
          { path: 'projectId', select: 'name status' },
          { path: 'jobId', select: 'title' },
        ]);
      }
    }

    // If previously rejected, re-open request as pending
    if (conversation.status === 'rejected') {
      conversation.status = 'pending';
      conversation.initiatedBy = user.id;
      conversation.requestMessage = requestNote;
      conversation.lastMessage = `Chat request: ${requestNote}`;
      conversation.lastMessageAt = new Date().toISOString();
      conversation.rejectedAt = null;
      if (jobId) conversation.jobId = jobId;
      if (projectId) conversation.projectId = projectId;
      await conversation.save();
    }
  } else {
    // Create new conversation with pending status
    conversation = new Conversation({
      participants: [user.id, recipientId],
      participantA: user.id,
      participantB: recipientId,
      projectId: projectId || null,
      jobId: jobId || null,
      conversationType: 'direct',
      status: 'pending',
      initiatedBy: user.id,
      requestMessage: requestNote,
      lastMessage: `Chat request: ${requestNote}`,
      lastMessageAt: new Date().toISOString(),
    });
    await conversation.save();
  }

  // Create in-app notification for recipient
  await createNotification({
    userId: recipientId,
    type: 'CHAT_REQUEST',
    title: 'New Chat Request',
    message: `${user.name || 'User'} sent you a chat request: "${requestNote.substring(0, 45)}${requestNote.length > 45 ? '...' : ''}"`,
    data: { conversationId: conversation._id.toString(), requesterId: user.id },
    relatedEntityType: 'Conversation',
    relatedEntityId: conversation._id,
  });

  // Real-time Socket.IO emission
  try {
    const io = getIO();
    if (io) {
      io.to(`user:${recipientId}`).emit('chat_request:received', {
        conversationId: conversation._id,
        requester: { id: user.id, name: user.name, role: user.role },
        message: requestNote,
      });
      io.to(`user:${user.id}`).emit('chat_request:sent', {
        conversationId: conversation._id,
      });
    }
  } catch (_e) {}

  return await conversation.populate([
    { path: 'participants', select: 'name role email phone' },
    { path: 'projectId', select: 'name status' },
    { path: 'jobId', select: 'title' },
  ]);
};

// Accept or Reject Chat Request
export const respondToChatRequest = async (user, conversationId, action) => {
  const conversation = await getConversation(user, conversationId);

  if (conversation.status !== 'pending') {
    const error = new Error(`Conversation is not in pending status (current: ${conversation.status})`);
    error.statusCode = 400;
    throw error;
  }

  const initiatorId = (conversation.initiatedBy?._id || conversation.initiatedBy?.id || conversation.initiatedBy)?.toString();
  if (initiatorId === user.id.toString()) {
    const error = new Error('Cannot respond to your own chat request');
    error.statusCode = 403;
    throw error;
  }

  if (action === 'accept') {
    conversation.status = 'accepted';
    conversation.acceptedAt = new Date().toISOString();
    conversation.lastMessage = 'Chat request accepted. You can now communicate freely.';
    conversation.lastMessageAt = new Date().toISOString();
    await conversation.save();

    // Create system message
    const welcomeMsg = new Message({
      conversationId: conversation._id,
      senderId: user.id,
      receiverId: initiatorId,
      messageType: 'system',
      content: 'Chat request accepted. Communication is now active.',
    });
    await welcomeMsg.save();

    // Notify requester
    await createNotification({
      userId: initiatorId,
      type: 'CHAT_REQUEST_ACCEPTED',
      title: 'Chat Request Accepted',
      message: `${user.name || 'User'} accepted your chat request! You can now send messages, photos, and voice notes.`,
      data: { conversationId: conversation._id.toString() },
      relatedEntityType: 'Conversation',
      relatedEntityId: conversation._id,
    });

    try {
      const io = getIO();
      if (io) {
        io.to(`user:${initiatorId}`).emit('chat_request:accepted', {
          conversationId: conversation._id,
          acceptedBy: { id: user.id, name: user.name },
        });
        io.to(`conversation:${conversation._id.toString()}`).emit('chat_request:accepted', {
          conversationId: conversation._id,
        });
      }
    } catch (_e) {}

    return conversation;
  } else if (action === 'reject') {
    conversation.status = 'rejected';
    conversation.rejectedAt = new Date().toISOString();
    await conversation.save();

    try {
      const io = getIO();
      if (io) {
        io.to(`user:${initiatorId}`).emit('chat_request:rejected', {
          conversationId: conversation._id,
        });
      }
    } catch (_e) {}

    return conversation;
  } else {
    const error = new Error('Invalid response action. Must be accept or reject');
    error.statusCode = 400;
    throw error;
  }
};

// Retrieve pending chat requests (incoming and outgoing)
export const getPendingChatRequests = async (user) => {
  const allUserConversations = await Conversation.find({
    participants: user.id,
    status: 'pending',
  }).populate([
    { path: 'participants', select: 'name role email phone' },
    { path: 'projectId', select: 'name status' },
    { path: 'jobId', select: 'title' },
  ]);

  const incoming = [];
  const outgoing = [];

  for (const conv of allUserConversations) {
    const initiatorId = (conv.initiatedBy?._id || conv.initiatedBy?.id || conv.initiatedBy)?.toString();
    if (initiatorId === user.id.toString()) {
      outgoing.push(conv);
    } else {
      incoming.push(conv);
    }
  }

  return { incoming, outgoing };
};

// Get all conversations for a user (accepted and pending)
export const getUserConversations = async (user) => {
  return await Conversation.find({
    participants: user.id,
    status: { $in: ['accepted', 'active', 'pending'] },
  })
    .sort({ lastMessageAt: -1 })
    .populate([
      { path: 'participants', select: 'name role email phone' },
      { path: 'projectId', select: 'name status' },
      { path: 'jobId', select: 'title' },
    ]);
};

// Get single conversation details
export const getConversation = async (user, conversationId) => {
  const conversation = await Conversation.findById(conversationId).populate([
    { path: 'participants', select: 'name role email phone' },
    { path: 'projectId', select: 'name status' },
    { path: 'jobId', select: 'title' },
  ]);

  if (!conversation) {
    const error = new Error('Conversation not found');
    error.statusCode = 404;
    throw error;
  }

  const isParticipant = conversation.participants.some(
    (p) => (p._id || p.id || p)?.toString() === user.id.toString()
  );
  if (!isParticipant) {
    const error = new Error('Unauthorized to access this conversation');
    error.statusCode = 403;
    throw error;
  }

  return conversation;
};

// Send message (text, image, audio)
export const sendMessage = async (user, conversationId, inputData) => {
  const conversation = await getConversation(user, conversationId);

  // Pre-agreement chat request enforcement:
  if (conversation.status === 'pending') {
    const error = new Error('Cannot send messages while chat request is pending. Recipient must accept the request first.');
    error.statusCode = 403;
    throw error;
  }

  if (conversation.status === 'rejected') {
    const error = new Error('Cannot send messages in a rejected conversation');
    error.statusCode = 403;
    throw error;
  }

  const receiver = conversation.participants.find(
    (p) => (p._id || p.id || p)?.toString() !== user.id.toString()
  );
  const receiverId = receiver ? (receiver._id || receiver.id || receiver).toString() : user.id;

  const msgType = inputData.messageType || 'text';
  let displayContent = (inputData.content || '').trim();
  if (!displayContent) {
    if (msgType === 'image') displayContent = '📷 Photo';
    else if (msgType === 'audio') displayContent = '🎤 Voice message';
    else displayContent = 'Attachment';
  }

  const message = new Message({
    conversationId: conversation._id,
    senderId: user.id,
    receiverId,
    messageType: msgType,
    content: displayContent,
    attachmentUrl: inputData.attachmentUrl || null,
    attachmentName: inputData.attachmentName || null,
    attachmentSize: inputData.attachmentSize || 0,
    duration: inputData.duration || 0,
    attachments: inputData.attachments || (inputData.attachmentUrl ? [inputData.attachmentUrl] : []),
  });

  await message.save();

  conversation.lastMessage = displayContent;
  conversation.lastMessageAt = new Date().toISOString();
  await conversation.save();

  // Create notification for receiver
  await createNotification({
    userId: receiverId,
    type: 'NEW_MESSAGE',
    title: 'New Chat Message',
    message: `${user.name || 'User'}: "${displayContent.substring(0, 40)}${displayContent.length > 40 ? '...' : ''}"`,
    data: { conversationId: conversation._id.toString(), messageId: message._id.toString() },
    relatedEntityType: 'Conversation',
    relatedEntityId: conversation._id,
  });

  // Emit real-time Socket event
  try {
    const io = getIO();
    if (io) {
      io.to(`conversation:${conversation._id.toString()}`).emit('message:new', message);
      io.to(`user:${receiverId}`).emit('message:new', message);
    }
  } catch (_e) {}

  return message;
};

// Retrieve messages
export const getMessages = async (user, conversationId, limit = 100) => {
  await getConversation(user, conversationId); // Security check

  return await Message.find({ conversationId })
    .sort({ createdAt: 1 })
    .limit(limit)
    .populate('senderId', 'name role');
};

// Mark message as read
export const markMessageRead = async (user, messageId) => {
  const message = await Message.findById(messageId);
  if (!message) {
    const error = new Error('Message not found');
    error.statusCode = 404;
    throw error;
  }

  if (message.receiverId && message.receiverId.toString() !== user.id.toString()) {
    const error = new Error('Unauthorized to mark this message as read');
    error.statusCode = 403;
    throw error;
  }

  message.isRead = true;
  message.readAt = new Date().toISOString();
  await message.save();

  // Notify sender of read receipt
  try {
    const io = getIO();
    if (io) {
      io.to(`user:${message.senderId}`).emit('message:read', {
        messageId: message._id,
        conversationId: message.conversationId,
        readAt: message.readAt,
      });
      io.to(`conversation:${message.conversationId}`).emit('message:read', {
        messageId: message._id,
        conversationId: message.conversationId,
        readAt: message.readAt,
      });
    }
  } catch (_e) {}

  return message;
};
