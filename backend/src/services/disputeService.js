import { Dispute, Project, ProjectWorker } from '../models/index.js';
import { createNotification } from './notificationService.js';

export const createDispute = async (user, inputData) => {
  const project = await Project.findById(inputData.projectId);
  if (!project) {
    const error = new Error('Project not found');
    error.statusCode = 404;
    throw error;
  }

  const isEmp = project.employerId.toString() === user.id;
  const isWrk = await ProjectWorker.exists({ projectId: project._id, workerId: user.id });

  if (!isEmp && !isWrk) {
    const error = new Error('Unauthorized: Only project participants can initiate a dispute');
    error.statusCode = 403;
    throw error;
  }

  if (user.id === inputData.againstUserId) {
    const error = new Error('You cannot initiate a dispute against yourself');
    error.statusCode = 400;
    throw error;
  }

  const againstIsEmp = project.employerId.toString() === inputData.againstUserId;
  const againstIsWrk = await ProjectWorker.exists({ projectId: project._id, workerId: inputData.againstUserId });

  if (!againstIsEmp && !againstIsWrk) {
    const error = new Error('Target user is not a participant in this project');
    error.statusCode = 400;
    throw error;
  }

  const dispute = new Dispute({
    projectId: project._id,
    initiatedBy: user.id,
    againstUserId: inputData.againstUserId,
    type: inputData.type,
    amount: inputData.amount || 0,
    description: inputData.description,
    evidence: inputData.evidence || [],
    status: 'open',
  });

  await dispute.save();

  // Create Notifications
  await createNotification({
    userId: inputData.againstUserId,
    type: 'DISPUTE_CREATED',
    title: 'Dispute Initiated',
    message: `A project dispute regarding ${inputData.type} has been opened for project ${project.name}.`,
    data: { disputeId: dispute._id.toString(), projectId: project._id.toString() },
    relatedEntityType: 'Dispute',
    relatedEntityId: dispute._id,
  });

  await createNotification({
    userId: user.id,
    type: 'DISPUTE_CREATED',
    title: 'Dispute Filed',
    message: `Your dispute regarding ${inputData.type} has been successfully filed.`,
    data: { disputeId: dispute._id.toString(), projectId: project._id.toString() },
    relatedEntityType: 'Dispute',
    relatedEntityId: dispute._id,
  });

  return await dispute.populate(['projectId', 'initiatedBy', 'againstUserId']);
};

export const getMyDisputes = async (user) => {
  return await Dispute.find({
    $or: [{ initiatedBy: user.id }, { againstUserId: user.id }],
  })
    .sort({ createdAt: -1 })
    .populate(['projectId', 'initiatedBy', 'againstUserId']);
};

export const getDispute = async (user, disputeId) => {
  const dispute = await Dispute.findById(disputeId).populate(['projectId', 'initiatedBy', 'againstUserId']);

  if (!dispute) {
    const error = new Error('Dispute not found');
    error.statusCode = 404;
    throw error;
  }

  const isInitiator = dispute.initiatedBy._id.toString() === user.id;
  const isAgainst = dispute.againstUserId._id.toString() === user.id;
  const isAdmin = user.role === 'admin';

  if (!isInitiator && !isAgainst && !isAdmin) {
    const error = new Error('Unauthorized to access this dispute record');
    error.statusCode = 403;
    throw error;
  }

  return dispute;
};

export const cancelDispute = async (user, disputeId) => {
  const dispute = await Dispute.findById(disputeId);
  if (!dispute) {
    const error = new Error('Dispute not found');
    error.statusCode = 404;
    throw error;
  }

  if (dispute.initiatedBy.toString() !== user.id) {
    const error = new Error('Only the initiator can cancel their dispute');
    error.statusCode = 403;
    throw error;
  }

  if (dispute.status !== 'open') {
    const error = new Error(`Cannot cancel dispute in '${dispute.status}' status`);
    error.statusCode = 400;
    throw error;
  }

  dispute.status = 'rejected';
  dispute.resolution = 'Cancelled by initiator';
  dispute.resolvedAt = new Date();
  await dispute.save();

  return dispute;
};
