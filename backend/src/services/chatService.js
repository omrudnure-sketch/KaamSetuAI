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
      const isEmp = project.employerId.toString() === user1Id || project.employerId.toString() === user2Id;
      const hasWorker1 = await ProjectWorker.exists({ projectId, workerId: user1Id });
      const hasWorker2 = await ProjectWorker.exists({ projectId, workerId: user2Id });
      if (isEmp && (hasWorker1 || hasWorker2)) return true;
      if (hasWorker1 && hasWorker2) return true;
    }
  }

  if (jobId) {
    const job = await Job.findById(jobId);
    if (job) {
      const isEmp = job.employerId.toString() === user1Id || job.employerId.toString() === user2Id;
      const otherUser = isEmp ? (job.employerId.toString() === user1Id ? user2Id : user1Id) : null;
      if (otherUser) {
        const hasApp = await JobApplication.exists({ jobId, workerId: otherUser });
        const hasInv = await JobInvitation.exists({ jobId, workerId: otherUser });
        const hasAgr = await HiringAgreement.exists({ jobId, workerId: otherUser });
        if (hasApp || hasInv || hasAgr) return true;
      }
    }
  }

  // General check across agreements or applications
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
      projectId: projectId || null,
      jobId: jobId || null,
      conversationType: conversationType || (projectId ? 'project' : jobId ? 'job' : 'support'),
      status: 'active',
    });
    await conversation.save();
  }

  return await conversation.populate([
    { path: 'participants', select: 'name role email phone' },
    { path: 'projectId', select: 'name status' },
    { path: 'jobId', select: 'title' },
  ]);
};

export const getUserConversations = async (user) => {
  return await Conversation.find({ participants: user.id, status: 'active' })
    .sort({ lastMessageAt: -1 })
    .populate([
      { path: 'participants', select: 'name role email phone' },
      { path: 'projectId', select: 'name status' },
      { path: 'jobId', select: 'title' },
    ]);
};

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

  const isParticipant = conversation.participants.some((p) => p._id.toString() === user.id);
  if (!isParticipant) {
    const error = new Error('Unauthorized to access this conversation');
    error.statusCode = 403;
    throw error;
  }

  return conversation;
};

export const sendMessage = async (user, conversationId, inputData) => {
  const conversation = await getConversation(user, conversationId);

  const receiver = conversation.participants.find((p) => p._id.toString() !== user.id);
  const receiverId = receiver ? receiver._id.toString() : user.id;

  const message = new Message({
    conversationId: conversation._id,
    senderId: user.id,
    receiverId,
    messageType: inputData.messageType || 'text',
    content: inputData.content,
    attachments: inputData.attachments || [],
  });

  await message.save();

  conversation.lastMessage = inputData.content;
  conversation.lastMessageAt = new Date();
  await conversation.save();

  // Create notification for receiver
  await createNotification({
    userId: receiverId,
    type: 'NEW_MESSAGE',
    title: 'New Chat Message',
    message: `${user.name || 'User'}: "${inputData.content.substring(0, 40)}${inputData.content.length > 40 ? '...' : ''}"`,
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

export const getMessages = async (user, conversationId, limit = 100) => {
  await getConversation(user, conversationId); // Security check

  return await Message.find({ conversationId })
    .sort({ createdAt: 1 })
    .limit(limit)
    .populate('senderId', 'name role');
};

export const markMessageRead = async (user, messageId) => {
  const message = await Message.findById(messageId);
  if (!message) {
    const error = new Error('Message not found');
    error.statusCode = 404;
    throw error;
  }

  if (message.receiverId.toString() !== user.id) {
    const error = new Error('Unauthorized to mark this message as read');
    error.statusCode = 403;
    throw error;
  }

  message.readAt = new Date();
  await message.save();
  return message;
};
