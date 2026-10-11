import HiringAgreement from '../models/HiringAgreement.js';
import JobApplication from '../models/JobApplication.js';
import JobInvitation from '../models/JobInvitation.js';
import Job from '../models/Job.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { getIO } from '../socket/socketManager.js';

// Helper hook for event logging
const emitEvent = (eventName, data) => {
  console.log(`[Event Emitted] ${eventName}:`, data);
};

// Safe date parser to YYYY-MM-DD
export const parseDateToIsoDate = (val) => {
  if (!val) return null;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    // DD-MM-YYYY format
    if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
      const [day, month, year] = trimmed.split('-');
      return `${year}-${month}-${day}`;
    }
    // YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
  }
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
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

  const currentUserId = (user?.id || user?._id || '').toString();
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

    jobId = application.jobId;
    workerId = application.workerId;

    // In Supabase PostgreSQL, employer_id is on the Job table, not job_applications
    let appEmployerId = application.employerId;
    if (jobId) {
      const job = await Job.findById(jobId);
      if (job && job.employerId) {
        appEmployerId = job.employerId;
      }
    }

    if (!appEmployerId) {
      const error = new Error('Could not determine employer for this application');
      error.statusCode = 400;
      throw error;
    }

    employerId = appEmployerId;

    const isEmp = employerId && employerId.toString() === currentUserId;
    const isWrk = workerId && workerId.toString() === currentUserId;
    const isAdmin = user?.role === 'admin' || Boolean(user?.adminRole);
    if (!isEmp && !isWrk && !isAdmin) {
      const error = new Error('Unauthorized to create hiring agreement from this application');
      error.statusCode = 403;
      throw error;
    }
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

    jobId = invitation.jobId;
    employerId = invitation.employerId;
    workerId = invitation.workerId;

    const isEmp = employerId && employerId.toString() === currentUserId;
    const isWrk = workerId && workerId.toString() === currentUserId;
    const isAdmin = user?.role === 'admin' || Boolean(user?.adminRole);
    if (!isEmp && !isWrk && !isAdmin) {
      const error = new Error('Unauthorized to create hiring agreement from this invitation');
      error.statusCode = 403;
      throw error;
    }
  } else {
    const error = new Error('Invalid sourceType. Must be application or invitation');
    error.statusCode = 400;
    throw error;
  }

  // Prevent duplicate active agreements for the same job, worker, and employer
  const existingAgreement = await HiringAgreement.findOne({
    jobId,
    workerId,
    employerId,
    status: { $nin: ['rejected', 'cancelled', 'expired'] },
  });
  if (existingAgreement) {
    return existingAgreement;
  }

  const proposedBy = user?.role === 'employer' ? 'employer' : 'worker';
  const employerAccepted = proposedBy === 'employer';
  const workerAccepted = proposedBy === 'worker';
  const status = proposedBy === 'employer' ? 'pending_worker' : 'pending_employer';

  const cleanStartDate = parseDateToIsoDate(startDate) || new Date().toISOString().split('T')[0];
  const cleanEndDate = parseDateToIsoDate(estimatedEndDate);
  const numericWage = Number(proposedWage);

  const initialOffer = {
    version: 1,
    proposedBy,
    wage: numericWage,
    wageType: wageType || 'daily',
    durationType: durationType || 'single_day',
    startDate: cleanStartDate,
    estimatedEndDate: cleanEndDate,
    expectedEndDate: cleanEndDate,
    workingHours: workingHours || { start: '09:00', end: '18:00', description: '' },
    message: message || '',
    createdAt: new Date().toISOString(),
  };

  const agreement = await HiringAgreement.create({
    jobId,
    employerId,
    workerId,
    sourceType,
    sourceId,
    durationType: durationType || 'single_day',
    startDate: cleanStartDate,
    expectedEndDate: cleanEndDate,
    estimatedEndDate: cleanEndDate,
    wageType: wageType || 'daily',
    proposedWage: numericWage,
    agreedWage: numericWage, // Satisfies PostgreSQL agreed_wage NUMERIC NOT NULL
    terms: message || '',
    workingHours: workingHours || { start: '09:00', end: '18:00', description: '' },
    message: message || '',
    proposedBy,
    status,
    employerAccepted,
    workerAccepted,
    currentVersion: 1,
    offerHistory: [initialOffer],
  });

  // Create in-app notification for counter-party without failing application if notification fails
  try {
    const recipientId = proposedBy === 'employer' ? workerId : employerId;
    const recipientRole = proposedBy === 'employer' ? 'worker' : 'employer';
    const notifTitle = proposedBy === 'employer'
      ? 'New Hiring Agreement Proposal Received'
      : 'Counter / Agreement Proposal Received';
    const notifMsg = `${user.name || 'User'} has sent a hiring proposal for ₹${numericWage} (${wageType || 'daily'}).`;

    const notif = await Notification.create({
      userId: recipientId,
      type: 'HIRING_PROPOSED',
      title: notifTitle,
      message: notifMsg,
      data: {
        agreementId: agreement.id || agreement._id,
        jobId,
        proposedBy,
        proposedWage: numericWage,
        wageType,
        actionUrl: `/${recipientRole}/hiring/${agreement.id || agreement._id}`,
      },
      isRead: false,
    });

    const io = getIO();
    if (io) {
      io.to(`user:${recipientId}`).emit('notification', notif);
    }
  } catch (notifErr) {
    console.warn('[Hiring Notification Warning]: Could not send notification:', notifErr.message);
  }

  emitEvent('HIRING_PROPOSED', {
    agreementId: agreement._id || agreement.id,
    jobId,
    employerId,
    workerId,
    proposedBy,
  });

  return agreement;
};

export const getHiringAgreement = async (user, agreementId) => {
  const userId = (user?.id || user?._id || user || '').toString();
  const agreement = await HiringAgreement.findById(agreementId)
    .populate('jobId')
    .populate('employerId', 'name preferredLanguage status')
    .populate('workerId', 'name preferredLanguage status');

  if (!agreement) {
    const error = new Error('Hiring agreement not found');
    error.statusCode = 404;
    throw error;
  }

  const empId = (agreement.employerId?._id || agreement.employerId?.id || agreement.employerId || '').toString();
  const wrkId = (agreement.workerId?._id || agreement.workerId?.id || agreement.workerId || '').toString();

  const isEmp = empId && empId === userId;
  const isWrk = wrkId && wrkId === userId;
  const isAdmin = user?.role === 'admin' || Boolean(user?.adminRole);

  if (!isEmp && !isWrk && !isAdmin) {
    const error = new Error('Unauthorized to access this hiring agreement');
    error.statusCode = 403;
    throw error;
  }

  // Contact details authorization:
  // Visible ONLY after the agreement is mutually confirmed.
  // For pending/counter proposals, hide private phone and email.
  if (agreement.status === 'confirmed') {
    if (isEmp || isAdmin) {
      const workerUser = await User.findById(wrkId);
      if (workerUser) {
        agreement.workerContact = {
          id: workerUser.id,
          name: workerUser.name || 'Worker',
          phone: workerUser.phone || null,
          email: workerUser.email || null,
          preferredLanguage: workerUser.preferredLanguage || null,
          contactPreference: workerUser.phone ? 'Phone' : (workerUser.email ? 'Email' : 'In-App'),
        };
        if (agreement.workerId && typeof agreement.workerId === 'object') {
          agreement.workerId.phone = workerUser.phone || null;
          agreement.workerId.email = workerUser.email || null;
        }
      }
    }
    if (isWrk || isAdmin) {
      const employerUser = await User.findById(empId);
      if (employerUser) {
        agreement.employerContact = {
          id: employerUser.id,
          name: employerUser.name || 'Employer',
          phone: employerUser.phone || null,
          email: employerUser.email || null,
          preferredLanguage: employerUser.preferredLanguage || null,
          contactPreference: employerUser.phone ? 'Phone' : (employerUser.email ? 'Email' : 'In-App'),
        };
        if (agreement.employerId && typeof agreement.employerId === 'object') {
          agreement.employerId.phone = employerUser.phone || null;
          agreement.employerId.email = employerUser.email || null;
        }
      }
    }
  } else {
    // Explicitly delete phone & email from populated objects if not confirmed
    if (agreement.workerId && typeof agreement.workerId === 'object') {
      delete agreement.workerId.phone;
      delete agreement.workerId.email;
    }
    if (agreement.employerId && typeof agreement.employerId === 'object') {
      delete agreement.employerId.phone;
      delete agreement.employerId.email;
    }
  }

  return agreement;
};

// Protected endpoint service to retrieve verified contact details for confirmed agreements
export const getAgreementContactDetails = async (user, agreementId) => {
  const userId = (user?.id || user?._id || '').toString();
  const agreement = await HiringAgreement.findById(agreementId);
  if (!agreement) {
    const error = new Error('Hiring agreement not found');
    error.statusCode = 404;
    throw error;
  }

  const empId = (agreement.employerId?._id || agreement.employerId?.id || agreement.employerId || '').toString();
  const wrkId = (agreement.workerId?._id || agreement.workerId?.id || agreement.workerId || '').toString();

  const isEmp = empId && empId === userId;
  const isWrk = wrkId && wrkId === userId;
  const isAdmin = user?.role === 'admin' || Boolean(user?.adminRole);

  if (!isEmp && !isWrk && !isAdmin) {
    const error = new Error('Unauthorized to access contact details for this hiring agreement');
    error.statusCode = 403;
    throw error;
  }

  // Must be mutually confirmed
  if (agreement.status !== 'confirmed') {
    const error = new Error('Contact details are only accessible after the agreement is mutually confirmed');
    error.statusCode = 403;
    throw error;
  }

  const result = {
    agreementId: agreement.id || agreement._id,
    status: agreement.status,
    confirmedAt: agreement.confirmedAt || agreement.updatedAt,
  };

  if (isEmp || isAdmin) {
    const workerUser = await User.findById(wrkId);
    result.worker = {
      id: workerUser ? workerUser.id : wrkId,
      name: workerUser?.name || 'Worker',
      phone: workerUser?.phone || null,
      email: workerUser?.email || null,
      preferredLanguage: workerUser?.preferredLanguage || null,
      contactPreference: workerUser?.phone ? 'Phone' : (workerUser?.email ? 'Email' : 'In-App'),
    };
  }

  if (isWrk || isAdmin) {
    const employerUser = await User.findById(empId);
    result.employer = {
      id: employerUser ? employerUser.id : empId,
      name: employerUser?.name || 'Employer',
      phone: employerUser?.phone || null,
      email: employerUser?.email || null,
      preferredLanguage: employerUser?.preferredLanguage || null,
      contactPreference: employerUser?.phone ? 'Phone' : (employerUser?.email ? 'Email' : 'In-App'),
    };
  }

  return result;
};

export const getWorkerHiringAgreements = async (workerId) => {
  const agreements = await HiringAgreement.find({ workerId })
    .populate('jobId')
    .populate('employerId', 'name preferredLanguage')
    .sort({ updatedAt: -1 });

  return agreements;
};

export const getEmployerHiringAgreements = async (employerId) => {
  const agreements = await HiringAgreement.find({ employerId })
    .populate('jobId')
    .populate('workerId', 'name preferredLanguage status')
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

  const empId = (agreement.employerId?._id || agreement.employerId?.id || agreement.employerId || '').toString();
  const wrkId = (agreement.workerId?._id || agreement.workerId?.id || agreement.workerId || '').toString();
  const currentUserId = userId.toString();

  if (userRole === 'employer') {
    if (empId !== currentUserId) {
      const error = new Error('Unauthorized: You are not the employer for this agreement');
      error.statusCode = 403;
      throw error;
    }
    agreement.employerAccepted = true;
  } else if (userRole === 'worker') {
    if (wrkId !== currentUserId) {
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

  // In Supabase, employer_accepted and worker_accepted are not dedicated columns.
  // The party who proposed or countered has implicitly accepted the current terms.
  const empAccepted = Boolean(
    agreement.employerAccepted ||
    agreement.proposedBy === 'employer' ||
    agreement.status === 'pending_worker'
  );
  const wrkAccepted = Boolean(
    agreement.workerAccepted ||
    agreement.proposedBy === 'worker' ||
    agreement.status === 'pending_employer'
  );

  if (empAccepted && wrkAccepted) {
    agreement.status = 'confirmed';
    agreement.agreedWage = agreement.proposedWage || agreement.agreedWage;
    agreement.confirmedAt = new Date().toISOString();

    // Notify both parties that agreement is officially confirmed
    try {
      const notifData = {
        agreementId: agreement.id || agreement._id,
        jobId: agreement.jobId,
        agreedWage: agreement.agreedWage,
      };

      const workerNotif = await Notification.create({
        userId: wrkId,
        type: 'HIRING_CONFIRMED',
        title: 'Hiring Agreement Confirmed!',
        message: 'Your hiring agreement has been confirmed by both parties. Employer contact details are now unlocked.',
        data: { ...notifData, actionUrl: `/worker/hiring/${agreement.id || agreement._id}` },
        isRead: false,
      });

      const employerNotif = await Notification.create({
        userId: empId,
        type: 'HIRING_CONFIRMED',
        title: 'Hiring Agreement Confirmed!',
        message: 'Your hiring agreement has been confirmed by both parties. Worker contact details are now unlocked.',
        data: { ...notifData, actionUrl: `/employer/hiring/${agreement.id || agreement._id}` },
        isRead: false,
      });

      const io = getIO();
      if (io) {
        io.to(`user:${wrkId}`).emit('notification', workerNotif);
        io.to(`user:${empId}`).emit('notification', employerNotif);
      }
    } catch (notifErr) {
      console.warn('[Confirmation Notification Notice]:', notifErr.message);
    }

    emitEvent('HIRING_CONFIRMED', {
      agreementId: agreement._id || agreement.id,
      jobId: agreement.jobId,
      employerId: agreement.employerId,
      workerId: agreement.workerId,
      agreedWage: agreement.agreedWage,
    });
  } else {
    agreement.status = userRole === 'employer' ? 'pending_worker' : 'pending_employer';
    emitEvent('HIRING_ACCEPTED', {
      agreementId: agreement._id || agreement.id,
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

  const empId = (agreement.employerId?._id || agreement.employerId?.id || agreement.employerId || '').toString();
  const wrkId = (agreement.workerId?._id || agreement.workerId?.id || agreement.workerId || '').toString();
  const currentUserId = userId.toString();

  const isEmp = empId === currentUserId;
  const isWrk = wrkId === currentUserId;
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

  const empId = (agreement.employerId?._id || agreement.employerId?.id || agreement.employerId || '').toString();
  const wrkId = (agreement.workerId?._id || agreement.workerId?.id || agreement.workerId || '').toString();
  const currentUserId = userId.toString();

  const isEmp = empId === currentUserId && userRole === 'employer';
  const isWrk = wrkId === currentUserId && userRole === 'worker';
  if (!isEmp && !isWrk) {
    const error = new Error('Unauthorized to submit counter offer for this agreement');
    error.statusCode = 403;
    throw error;
  }

  const newVersion = (agreement.currentVersion || 1) + 1;
  const proposedBy = userRole === 'employer' ? 'employer' : 'worker';

  const cleanStartDate = parseDateToIsoDate(payload.startDate) || agreement.startDate;
  const cleanEndDate = parseDateToIsoDate(payload.estimatedEndDate);
  const numericWage = Number(payload.proposedWage);

  agreement.durationType = payload.durationType || agreement.durationType;
  agreement.startDate = cleanStartDate;
  agreement.estimatedEndDate = cleanEndDate;
  agreement.expectedEndDate = cleanEndDate;
  agreement.wageType = payload.wageType || agreement.wageType;
  agreement.proposedWage = numericWage;
  agreement.agreedWage = numericWage;
  agreement.workingHours = payload.workingHours || agreement.workingHours;
  agreement.message = payload.message || '';
  agreement.terms = payload.message || agreement.terms || '';
  agreement.currentVersion = newVersion;
  agreement.proposedBy = proposedBy;

  if (proposedBy === 'employer') {
    agreement.employerAccepted = true;
    agreement.workerAccepted = false;
    agreement.status = 'pending_worker';
  } else {
    agreement.workerAccepted = true;
    agreement.employerAccepted = false;
    agreement.status = 'pending_employer';
  }

  if (!Array.isArray(agreement.offerHistory)) {
    agreement.offerHistory = [];
  }

  agreement.offerHistory.push({
    version: newVersion,
    proposedBy,
    wage: numericWage,
    wageType: payload.wageType || agreement.wageType,
    durationType: payload.durationType || agreement.durationType,
    startDate: cleanStartDate,
    estimatedEndDate: cleanEndDate,
    expectedEndDate: cleanEndDate,
    workingHours: payload.workingHours || agreement.workingHours,
    message: payload.message || '',
    createdAt: new Date().toISOString(),
  });

  await agreement.save();

  emitEvent('HIRING_COUNTERED', {
    agreementId: agreement._id || agreement.id,
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

  const empId = (agreement.employerId?._id || agreement.employerId?.id || agreement.employerId || '').toString();
  const wrkId = (agreement.workerId?._id || agreement.workerId?.id || agreement.workerId || '').toString();
  const currentUserId = userId.toString();

  const isEmp = empId === currentUserId;
  const isWrk = wrkId === currentUserId;
  if (!isEmp && !isWrk) {
    const error = new Error('Unauthorized to cancel this agreement');
    error.statusCode = 403;
    throw error;
  }

  agreement.status = 'cancelled';
  await agreement.save();

  return agreement;
};
