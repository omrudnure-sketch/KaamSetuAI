import JobApplication from '../models/JobApplication.js';
import Job from '../models/Job.js';
import User from '../models/User.js';
import { createNotification } from './notificationService.js';

export const applyToJob = async (workerId, payload) => {
  const { jobId, message, proposedWage } = payload;

  const job = await Job.findById(jobId);
  if (!job) {
    const error = new Error('Job not found');
    error.statusCode = 404;
    throw error;
  }

  if (job.status !== 'open') {
    const error = new Error('Cannot apply to a job that is not open');
    error.statusCode = 400;
    throw error;
  }

  const jobEmployerId = job.employerId?._id || job.employerId?.id || job.employerId;
  if (jobEmployerId && jobEmployerId.toString() === workerId.toString()) {
    const error = new Error('Worker cannot apply to their own job');
    error.statusCode = 400;
    throw error;
  }

  const existingApplication = await JobApplication.findOne({ jobId, workerId });
  if (existingApplication) {
    const error = new Error('You have already applied to this job');
    error.statusCode = 409;
    throw error;
  }

  // Retrieve worker profile/name for notification
  let workerName = 'A worker';
  try {
    const worker = await User.findById(workerId);
    if (worker?.name) {
      workerName = worker.name;
    }
  } catch (_userErr) {
    // fallback name
  }

  const application = await JobApplication.create({
    jobId,
    workerId,
    employerId: jobEmployerId,
    coverNote: message || payload.coverNote || '',
    message: message || payload.coverNote || '',
    proposedWage: proposedWage || job.wageAmount,
    status: 'pending',
  });

  // Notify the authoritative employer who owns the job (try/catch so notification failure never fails application creation)
  try {
    if (jobEmployerId) {
      await createNotification({
        userId: jobEmployerId,
        type: 'JOB_APPLICATION',
        title: `New Application: ${job.title}`,
        message: `${workerName} applied for "${job.title}". Proposed wage: ₹${application.proposedWage || job.wageAmount}.`,
        data: {
          applicationId: String(application._id || application.id),
          jobId: String(job._id || job.id),
          workerId: String(workerId),
          workerName,
          jobTitle: job.title,
          submissionTime: application.createdAt || new Date().toISOString(),
          link: `/employer/jobs/${job._id || job.id}/applications`,
        },
        relatedEntityType: 'JobApplication',
        relatedEntityId: application._id || application.id,
      });
    }
  } catch (notifErr) {
    console.error('[Application Notification Notice]: Notification send error:', notifErr.message);
  }

  return application;
};

export const getWorkerApplications = async (workerId, query = {}) => {
  const filter = { workerId };
  if (query.status) {
    filter.status = query.status;
  }
  if (query.jobId) {
    filter.jobId = query.jobId;
  }

  const applications = await JobApplication.find(filter)
    .populate('jobId')
    .populate('employerId', 'name email phone')
    .sort({ createdAt: -1 });

  return applications;
};

export const getEmployerApplications = async (employerId, query = {}) => {
  let filter = {};
  if (query.jobId) {
    // Verify job belongs to this employer
    const job = await Job.findOne({ _id: query.jobId, employerId });
    if (!job) return [];
    filter.jobId = query.jobId;
  } else {
    // Find all jobs owned by employer
    const employerJobs = await Job.find({ employerId }).select('id _id');
    const jobIds = employerJobs.map((j) => String(j.id || j._id));
    if (jobIds.length === 0) return [];
    filter.jobId = { $in: jobIds };
  }

  if (query.status) {
    filter.status = query.status;
  }

  const applications = await JobApplication.find(filter)
    .populate('jobId')
    .populate('workerId', 'name email phone preferredLanguage status')
    .sort({ createdAt: -1 });

  return applications;
};

export const shortlistApplication = async (employerId, applicationId) => {
  const application = await JobApplication.findById(applicationId);
  if (!application) {
    const error = new Error('Application not found');
    error.statusCode = 404;
    throw error;
  }

  const job = application.jobId && typeof application.jobId === 'object'
    ? application.jobId
    : await Job.findById(application.jobId);
  const jobEmployerId = job?.employerId?.toString() || application.employerId?.toString();

  if (jobEmployerId !== employerId.toString()) {
    const error = new Error('Unauthorized to modify this application');
    error.statusCode = 403;
    throw error;
  }

  if (application.status !== 'pending') {
    const error = new Error(`Cannot shortlist application in status '${application.status}'`);
    error.statusCode = 400;
    throw error;
  }

  application.status = 'shortlisted';
  await application.save();

  return application;
};

export const selectApplication = async (employerId, applicationId) => {
  const application = await JobApplication.findById(applicationId);
  if (!application) {
    const error = new Error('Application not found');
    error.statusCode = 404;
    throw error;
  }

  const job = application.jobId && typeof application.jobId === 'object'
    ? application.jobId
    : await Job.findById(application.jobId);
  const jobEmployerId = job?.employerId?.toString() || application.employerId?.toString();

  if (jobEmployerId !== employerId.toString()) {
    const error = new Error('Unauthorized to modify this application');
    error.statusCode = 403;
    throw error;
  }

  if (application.status !== 'pending' && application.status !== 'shortlisted') {
    const error = new Error(`Cannot select application in status '${application.status}'`);
    error.statusCode = 400;
    throw error;
  }

  application.status = 'selected';
  await application.save();

  try {
    await createNotification({
      userId: application.workerId,
      type: 'APPLICATION_SELECTED',
      title: 'Application Selected!',
      message: 'Your job application has been selected by the employer.',
      data: { applicationId: application._id.toString(), jobId: (job?._id || application.jobId).toString() },
      relatedEntityType: 'JobApplication',
      relatedEntityId: application._id,
    });
  } catch (_e) {}

  return application;
};

export const rejectApplication = async (employerId, applicationId) => {
  const application = await JobApplication.findById(applicationId);
  if (!application) {
    const error = new Error('Application not found');
    error.statusCode = 404;
    throw error;
  }

  const job = application.jobId && typeof application.jobId === 'object'
    ? application.jobId
    : await Job.findById(application.jobId);
  const jobEmployerId = job?.employerId?.toString() || application.employerId?.toString();

  if (jobEmployerId !== employerId.toString()) {
    const error = new Error('Unauthorized to modify this application');
    error.statusCode = 403;
    throw error;
  }

  if (application.status === 'rejected' || application.status === 'withdrawn') {
    const error = new Error(`Application is already ${application.status}`);
    error.statusCode = 400;
    throw error;
  }

  application.status = 'rejected';
  await application.save();

  return application;
};

export const withdrawApplication = async (workerId, applicationId) => {
  const application = await JobApplication.findById(applicationId);
  if (!application) {
    const error = new Error('Application not found');
    error.statusCode = 404;
    throw error;
  }

  if (application.workerId.toString() !== workerId.toString()) {
    const error = new Error('Unauthorized to withdraw this application');
    error.statusCode = 403;
    throw error;
  }

  if (application.status !== 'pending' && application.status !== 'shortlisted') {
    const error = new Error(`Cannot withdraw application with status '${application.status}'`);
    error.statusCode = 400;
    throw error;
  }

  application.status = 'withdrawn';
  await application.save();

  return application;
};
