import { Complaint, User } from '../models/index.js';
import { validatePlatformRelationship } from './chatService.js';
import { createNotification } from './notificationService.js';

export const createComplaint = async (user, inputData) => {
  if (user.id === inputData.targetUserId) {
    const error = new Error('You cannot create a complaint against yourself');
    error.statusCode = 400;
    throw error;
  }

  const targetUser = await User.findById(inputData.targetUserId);
  if (!targetUser) {
    const error = new Error('Target user not found');
    error.statusCode = 404;
    throw error;
  }

  const hasRelationship = await validatePlatformRelationship(
    user.id,
    inputData.targetUserId,
    inputData.projectId,
    inputData.jobId
  );

  if (!hasRelationship) {
    const error = new Error('No legitimate platform relationship exists with the target user');
    error.statusCode = 403;
    throw error;
  }

  const complaint = new Complaint({
    reporterId: user.id,
    targetUserId: inputData.targetUserId,
    projectId: inputData.projectId || null,
    jobId: inputData.jobId || null,
    category: inputData.category,
    priority: inputData.priority || 'medium',
    description: inputData.description,
    evidence: inputData.evidence || [],
    status: 'new',
  });

  await complaint.save();

  // Create notification for support/admin tracking
  await createNotification({
    userId: user.id,
    type: 'COMPLAINT_CREATED',
    title: 'Complaint Submitted',
    message: `Your complaint regarding ${inputData.category} has been received and is under review.`,
    data: { complaintId: complaint._id.toString() },
    relatedEntityType: 'Complaint',
    relatedEntityId: complaint._id,
  });

  return await complaint.populate(['reporterId', 'targetUserId', 'projectId', 'jobId']);
};

export const getMyComplaints = async (user) => {
  return await Complaint.find({
    $or: [{ reporterId: user.id }, { targetUserId: user.id }],
  })
    .sort({ createdAt: -1 })
    .populate(['reporterId', 'targetUserId', 'projectId', 'jobId']);
};

export const getComplaint = async (user, complaintId) => {
  const complaint = await Complaint.findById(complaintId).populate([
    'reporterId',
    'targetUserId',
    'projectId',
    'jobId',
  ]);

  if (!complaint) {
    const error = new Error('Complaint not found');
    error.statusCode = 404;
    throw error;
  }

  const isReporter = complaint.reporterId._id.toString() === user.id;
  const isTarget = complaint.targetUserId._id.toString() === user.id;
  const isAdmin = user.role === 'admin';

  if (!isReporter && !isTarget && !isAdmin) {
    const error = new Error('Unauthorized to view this complaint');
    error.statusCode = 403;
    throw error;
  }

  return complaint;
};

export const cancelComplaint = async (user, complaintId) => {
  const complaint = await Complaint.findById(complaintId);
  if (!complaint) {
    const error = new Error('Complaint not found');
    error.statusCode = 404;
    throw error;
  }

  if (complaint.reporterId.toString() !== user.id) {
    const error = new Error('Only the reporter can cancel their complaint');
    error.statusCode = 403;
    throw error;
  }

  if (complaint.status !== 'new') {
    const error = new Error(`Cannot cancel complaint in '${complaint.status}' status`);
    error.statusCode = 400;
    throw error;
  }

  complaint.status = 'rejected';
  complaint.resolution = 'Cancelled by reporter';
  complaint.resolvedAt = new Date();
  await complaint.save();
  return complaint;
};
