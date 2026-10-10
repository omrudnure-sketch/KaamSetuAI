import JobInvitation from '../models/JobInvitation.js';
import Job from '../models/Job.js';
import User from '../models/User.js';

// Helper hook for future notification system
const emitEvent = (eventName, data) => {
  console.log(`[Event Emitted] ${eventName}:`, data);
};

export const inviteWorker = async (employerId, payload) => {
  const { jobId, workerId, message, proposedWage, expiresAt } = payload;

  const job = await Job.findById(jobId);
  if (!job) {
    const error = new Error('Job not found');
    error.statusCode = 404;
    throw error;
  }

  if (job.employerId.toString() !== employerId.toString()) {
    const error = new Error('You can only invite workers to your own job');
    error.statusCode = 403;
    throw error;
  }

  if (job.status !== 'open') {
    const error = new Error('Cannot invite workers to a job that is not open');
    error.statusCode = 400;
    throw error;
  }

  const targetWorker = await User.findById(workerId);
  if (!targetWorker || targetWorker.role !== 'worker') {
    const error = new Error('Target worker not found or user is not a worker');
    error.statusCode = 400;
    throw error;
  }

  // Prevent duplicate active invitations for the same job and worker
  const activeInvitation = await JobInvitation.findOne({
    jobId,
    workerId,
    status: 'pending',
  });
  if (activeInvitation) {
    const error = new Error('An active pending invitation already exists for this worker on this job');
    error.statusCode = 409;
    throw error;
  }

  const invitation = await JobInvitation.create({
    jobId,
    workerId,
    employerId,
    message: message || '',
    proposedWage: proposedWage || job.wageAmount,
    expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    status: 'pending',
  });

  emitEvent('JOB_INVITED', {
    invitationId: invitation._id,
    jobId,
    workerId,
    employerId,
  });

  return invitation;
};

export const getWorkerInvitations = async (workerId, query = {}) => {
  const filter = { workerId };
  if (query.status) {
    filter.status = query.status;
  }

  const invitations = await JobInvitation.find(filter)
    .populate('jobId')
    .populate('employerId', 'name email phone')
    .sort({ createdAt: -1 });

  return invitations;
};

export const getEmployerInvitations = async (employerId, query = {}) => {
  const filter = { employerId };
  if (query.jobId) {
    filter.jobId = query.jobId;
  }
  if (query.status) {
    filter.status = query.status;
  }

  const invitations = await JobInvitation.find(filter)
    .populate('jobId')
    .populate('workerId', 'name email phone preferredLanguage status')
    .sort({ createdAt: -1 });

  return invitations;
};

export const acceptInvitation = async (workerId, invitationId) => {
  const invitation = await JobInvitation.findById(invitationId);
  if (!invitation) {
    const error = new Error('Invitation not found');
    error.statusCode = 404;
    throw error;
  }

  if (invitation.workerId.toString() !== workerId.toString()) {
    const error = new Error('Unauthorized to modify this invitation');
    error.statusCode = 403;
    throw error;
  }

  if (invitation.status !== 'pending') {
    const error = new Error(`Cannot accept invitation in status '${invitation.status}'`);
    error.statusCode = 400;
    throw error;
  }

  invitation.status = 'accepted';
  await invitation.save();

  emitEvent('INVITATION_ACCEPTED', {
    invitationId: invitation._id,
    jobId: invitation.jobId,
    workerId: invitation.workerId,
    employerId: invitation.employerId,
  });

  return invitation;
};

export const rejectInvitation = async (workerId, invitationId) => {
  const invitation = await JobInvitation.findById(invitationId);
  if (!invitation) {
    const error = new Error('Invitation not found');
    error.statusCode = 404;
    throw error;
  }

  if (invitation.workerId.toString() !== workerId.toString()) {
    const error = new Error('Unauthorized to modify this invitation');
    error.statusCode = 403;
    throw error;
  }

  if (invitation.status !== 'pending') {
    const error = new Error(`Cannot reject invitation in status '${invitation.status}'`);
    error.statusCode = 400;
    throw error;
  }

  invitation.status = 'rejected';
  await invitation.save();

  return invitation;
};

export const cancelInvitation = async (employerId, invitationId) => {
  const invitation = await JobInvitation.findById(invitationId);
  if (!invitation) {
    const error = new Error('Invitation not found');
    error.statusCode = 404;
    throw error;
  }

  if (invitation.employerId.toString() !== employerId.toString()) {
    const error = new Error('Unauthorized to cancel this invitation');
    error.statusCode = 403;
    throw error;
  }

  if (invitation.status !== 'pending') {
    const error = new Error(`Cannot cancel invitation in status '${invitation.status}'`);
    error.statusCode = 400;
    throw error;
  }

  invitation.status = 'cancelled';
  await invitation.save();

  return invitation;
};
