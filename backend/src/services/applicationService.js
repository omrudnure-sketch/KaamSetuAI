import JobApplication from '../models/JobApplication.js';
import Job from '../models/Job.js';
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

  if (job.employerId.toString() === workerId.toString()) {
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

  const application = await JobApplication.create({
    jobId,
    workerId,
    employerId: job.employerId,
    message: message || '',
    proposedWage: proposedWage || job.wageAmount,
    status: 'pending',
  });

  await createNotification({
    userId: job.employerId,
    type: 'JOB_APPLICATION',
    title: 'New Job Application Received',
    message: `A worker submitted an application for your job posting: "${job.title}".`,
    data: { applicationId: application._id.toString(), jobId: job._id.toString() },
    relatedEntityType: 'JobApplication',
    relatedEntityId: application._id,
  });

  return application;
};

export const getWorkerApplications = async (workerId, query = {}) => {
  const filter = { workerId };
  if (query.status) {
    filter.status = query.status;
  }

  const applications = await JobApplication.find(filter)
    .populate('jobId')
    .populate('employerId', 'name email phone')
    .sort({ createdAt: -1 });

  return applications;
};

export const getEmployerApplications = async (employerId, query = {}) => {
  const filter = { employerId };
  if (query.jobId) {
    filter.jobId = query.jobId;
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

  if (application.employerId.toString() !== employerId.toString()) {
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

  if (application.employerId.toString() !== employerId.toString()) {
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

  await createNotification({
    userId: application.workerId,
    type: 'APPLICATION_SELECTED',
    title: 'Application Selected!',
    message: 'Your job application has been selected by the employer.',
    data: { applicationId: application._id.toString(), jobId: application.jobId.toString() },
    relatedEntityType: 'JobApplication',
    relatedEntityId: application._id,
  });

  return application;
};

export const rejectApplication = async (employerId, applicationId) => {
  const application = await JobApplication.findById(applicationId);
  if (!application) {
    const error = new Error('Application not found');
    error.statusCode = 404;
    throw error;
  }

  if (application.employerId.toString() !== employerId.toString()) {
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
