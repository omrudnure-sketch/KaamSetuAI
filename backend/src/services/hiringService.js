import HiringAgreement from '../models/HiringAgreement.js';
import JobApplication from '../models/JobApplication.js';
import JobInvitation from '../models/JobInvitation.js';

// Helper hook for future notification system
const emitEvent = (eventName, data) => {
  console.log(`[Event Emitted] ${eventName}:`, data);
};

export const createHiringAgreement = async (user, payload) => {
  const {
    sourceType,
    sourceId,
    durationType,
    startDate,
    estimatedEndDate,
    wageType,
    proposedWage,
    workingHours,
    message,
  } = payload;

  let jobId, employerId, workerId;

  if (sourceType === 'application') {
    const application = await JobApplication.findById(sourceId);
    if (!application) {
      const error = new Error('Source application not found');
      error.statusCode = 404;
      throw error;
    }

    if (application.status !== 'selected') {
      const error = new Error(
        `Only selected job applications can create a hiring agreement. Current status: '${application.status}'`
      );
      error.statusCode = 400;
      throw error;
    }

    const isEmp = application.employerId.toString() === user.id.toString();
    const isWrk = application.workerId.toString() === user.id.toString();
    if (!isEmp && !isWrk) {
      const error = new Error('Unauthorized to create hiring agreement from this application');
      error.statusCode = 403;
      throw error;
    }

    jobId = application.jobId;
    employerId = application.employerId;
    workerId = application.workerId;
  } else if (sourceType === 'invitation') {
    const invitation = await JobInvitation.findById(sourceId);
    if (!invitation) {
      const error = new Error('Source invitation not found');
      error.statusCode = 404;
      throw error;
    }

    if (invitation.status !== 'accepted') {
      const error = new Error(
        `Only accepted job invitations can create a hiring agreement. Current status: '${invitation.status}'`
      );
      error.statusCode = 400;
      throw error;
    }

    const isEmp = invitation.employerId.toString() === user.id.toString();
    const isWrk = invitation.workerId.toString() === user.id.toString();
    if (!isEmp && !isWrk) {
      const error = new Error('Unauthorized to create hiring agreement from this invitation');
      error.statusCode = 403;
      throw error;
    }

    jobId = invitation.jobId;
    employerId = invitation.employerId;
    workerId = invitation.workerId;
  } else {
    const error = new Error('Invalid sourceType. Must be application or invitation');
    error.statusCode = 400;
    throw error;
  }

  // Check if agreement already exists for this sourceId
  const existingAgreement = await HiringAgreement.findOne({
    sourceType,
    sourceId,
    status: { $nin: ['rejected', 'cancelled', 'expired'] },
  });
  if (existingAgreement) {
    return existingAgreement;
  }

  const proposedBy = user.role === 'employer' ? 'employer' : 'worker';
  const employerAccepted = proposedBy === 'employer';
  const workerAccepted = proposedBy === 'worker';
  const status = proposedBy === 'employer' ? 'pending_worker' : 'pending_employer';

  const initialOffer = {
    version: 1,
    proposedBy,
    wage: proposedWage,
    wageType,
    durationType,
    startDate: new Date(startDate),
    estimatedEndDate: estimatedEndDate ? new Date(estimatedEndDate) : null,
    workingHours: workingHours || { start: '09:00', end: '18:00', description: '' },
    message: message || '',
    createdAt: new Date(),
  };

  const agreement = await HiringAgreement.create({
    jobId,
    employerId,
    workerId,
    sourceType,
    sourceId,
    durationType,
    startDate: new Date(startDate),
    estimatedEndDate: estimatedEndDate ? new Date(estimatedEndDate) : null,
    wageType,
    proposedWage,
    agreedWage: null,
    workingHours: workingHours || { start: '09:00', end: '18:00', description: '' },
    message: message || '',
    status,
    employerAccepted,
    workerAccepted,
    currentVersion: 1,
    offerHistory: [initialOffer],
  });

  emitEvent('HIRING_PROPOSED', {
    agreementId: agreement._id,
    jobId,
    employerId,
    workerId,
    proposedBy,
  });

  return agreement;
};

export const getHiringAgreement = async (userId, agreementId) => {
  const agreement = await HiringAgreement.findById(agreementId)
    .populate('jobId')
    .populate('employerId', 'name email phone')
    .populate('workerId', 'name email phone preferredLanguage status');

  if (!agreement) {
    const error = new Error('Hiring agreement not found');
    error.statusCode = 404;
    throw error;
  }

  const isEmp = agreement.employerId._id.toString() === userId.toString();
  const isWrk = agreement.workerId._id.toString() === userId.toString();
  if (!isEmp && !isWrk) {
    const error = new Error('Unauthorized to access this hiring agreement');
    error.statusCode = 403;
    throw error;
  }

  return agreement;
};

export const getWorkerHiringAgreements = async (workerId) => {
  const agreements = await HiringAgreement.find({ workerId })
    .populate('jobId')
    .populate('employerId', 'name email phone')
    .sort({ updatedAt: -1 });

  return agreements;
};

export const getEmployerHiringAgreements = async (employerId) => {
  const agreements = await HiringAgreement.find({ employerId })
    .populate('jobId')
    .populate('workerId', 'name email phone preferredLanguage status')
    .sort({ updatedAt: -1 });

  return agreements;
};

export const acceptHiringAgreement = async (userId, userRole, agreementId) => {
  const agreement = await HiringAgreement.findById(agreementId);
  if (!agreement) {
    const error = new Error('Hiring agreement not found');
    error.statusCode = 404;
    throw error;
  }

  // Immutability check
  if (agreement.status === 'confirmed') {
    const error = new Error('Confirmed agreement is immutable and cannot be directly modified');
    error.statusCode = 400;
    throw error;
  }

  if (agreement.status === 'rejected' || agreement.status === 'cancelled') {
    const error = new Error(`Cannot accept an agreement in '${agreement.status}' status`);
    error.statusCode = 400;
    throw error;
  }

  if (userRole === 'employer') {
    if (agreement.employerId.toString() !== userId.toString()) {
      const error = new Error('Unauthorized: You are not the employer for this agreement');
      error.statusCode = 403;
      throw error;
    }
    agreement.employerAccepted = true;
  } else if (userRole === 'worker') {
    if (agreement.workerId.toString() !== userId.toString()) {
      const error = new Error('Unauthorized: You are not the worker for this agreement');
      error.statusCode = 403;
      throw error;
    }
    agreement.workerAccepted = true;
  } else {
    const error = new Error('Invalid user role for accepting agreement');
    error.statusCode = 403;
    throw error;
  }

  if (agreement.employerAccepted && agreement.workerAccepted) {
    agreement.status = 'confirmed';
    agreement.agreedWage = agreement.proposedWage;

    emitEvent('HIRING_CONFIRMED', {
      agreementId: agreement._id,
      jobId: agreement.jobId,
      employerId: agreement.employerId,
      workerId: agreement.workerId,
      agreedWage: agreement.agreedWage,
    });
  } else {
    agreement.status = userRole === 'employer' ? 'pending_worker' : 'pending_employer';
    emitEvent('HIRING_ACCEPTED', {
      agreementId: agreement._id,
      acceptedBy: userRole,
    });
  }

  await agreement.save();
  return agreement;
};

export const rejectHiringAgreement = async (userId, userRole, agreementId) => {
  const agreement = await HiringAgreement.findById(agreementId);
  if (!agreement) {
    const error = new Error('Hiring agreement not found');
    error.statusCode = 404;
    throw error;
  }

  if (agreement.status === 'confirmed') {
    const error = new Error('Confirmed agreement is immutable and cannot be directly modified');
    error.statusCode = 400;
    throw error;
  }

  const isEmp = agreement.employerId.toString() === userId.toString();
  const isWrk = agreement.workerId.toString() === userId.toString();
  if (!isEmp && !isWrk) {
    const error = new Error('Unauthorized to reject this agreement');
    error.statusCode = 403;
    throw error;
  }

  agreement.status = 'rejected';
  await agreement.save();

  return agreement;
};

export const counterOffer = async (userId, userRole, agreementId, payload) => {
  const agreement = await HiringAgreement.findById(agreementId);
  if (!agreement) {
    const error = new Error('Hiring agreement not found');
    error.statusCode = 404;
    throw error;
  }

  if (agreement.status === 'confirmed') {
    const error = new Error('Confirmed agreement is immutable and cannot be directly modified');
    error.statusCode = 400;
    throw error;
  }

  if (agreement.status === 'rejected' || agreement.status === 'cancelled') {
    const error = new Error(`Cannot submit counter-offer on '${agreement.status}' agreement`);
    error.statusCode = 400;
    throw error;
  }

  const isEmp = agreement.employerId.toString() === userId.toString() && userRole === 'employer';
  const isWrk = agreement.workerId.toString() === userId.toString() && userRole === 'worker';
  if (!isEmp && !isWrk) {
    const error = new Error('Unauthorized to submit counter offer for this agreement');
    error.statusCode = 403;
    throw error;
  }

  const newVersion = agreement.currentVersion + 1;
  const proposedBy = userRole === 'employer' ? 'employer' : 'worker';

  agreement.durationType = payload.durationType;
  agreement.startDate = new Date(payload.startDate);
  agreement.estimatedEndDate = payload.estimatedEndDate ? new Date(payload.estimatedEndDate) : null;
  agreement.wageType = payload.wageType;
  agreement.proposedWage = payload.proposedWage;
  agreement.workingHours = payload.workingHours || agreement.workingHours;
  agreement.message = payload.message || '';
  agreement.currentVersion = newVersion;

  if (proposedBy === 'employer') {
    agreement.employerAccepted = true;
    agreement.workerAccepted = false;
    agreement.status = 'pending_worker';
  } else {
    agreement.workerAccepted = true;
    agreement.employerAccepted = false;
    agreement.status = 'pending_employer';
  }

  agreement.offerHistory.push({
    version: newVersion,
    proposedBy,
    wage: payload.proposedWage,
    wageType: payload.wageType,
    durationType: payload.durationType,
    startDate: new Date(payload.startDate),
    estimatedEndDate: payload.estimatedEndDate ? new Date(payload.estimatedEndDate) : null,
    workingHours: payload.workingHours || { start: '09:00', end: '18:00', description: '' },
    message: payload.message || '',
    createdAt: new Date(),
  });

  await agreement.save();

  emitEvent('HIRING_COUNTERED', {
    agreementId: agreement._id,
    version: newVersion,
    proposedBy,
  });

  return agreement;
};

export const cancelHiringAgreement = async (userId, userRole, agreementId) => {
  const agreement = await HiringAgreement.findById(agreementId);
  if (!agreement) {
    const error = new Error('Hiring agreement not found');
    error.statusCode = 404;
    throw error;
  }

  if (agreement.status === 'confirmed') {
    const error = new Error('Confirmed agreement is immutable and cannot be directly modified');
    error.statusCode = 400;
    throw error;
  }

  const isEmp = agreement.employerId.toString() === userId.toString();
  const isWrk = agreement.workerId.toString() === userId.toString();
  if (!isEmp && !isWrk) {
    const error = new Error('Unauthorized to cancel this agreement');
    error.statusCode = 403;
    throw error;
  }

  agreement.status = 'cancelled';
  await agreement.save();

  return agreement;
};
