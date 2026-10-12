import Project from '../models/Project.js';
import ProjectWorker from '../models/ProjectWorker.js';
import HiringAgreement from '../models/HiringAgreement.js';
import Job from '../models/Job.js';

export const createFromConfirmedAgreement = async (userId, agreementId, overrides = {}) => {
  const agreement = await HiringAgreement.findById(agreementId);
  if (!agreement) {
    const error = new Error('Hiring agreement not found');
    error.statusCode = 404;
    throw error;
  }

  if (agreement.status !== 'confirmed') {
    const error = new Error(
      `Cannot create project from a hiring agreement in '${agreement.status}' status. Only confirmed agreements are eligible.`
    );
    error.statusCode = 400;
    throw error;
  }

  const isEmp = agreement.employerId.toString() === userId.toString();
  const isWrk = agreement.workerId.toString() === userId.toString();
  if (!isEmp && !isWrk) {
    const error = new Error('Unauthorized to create a project from this hiring agreement');
    error.statusCode = 403;
    throw error;
  }

  // Check if project already exists for this confirmed hiring agreement
  const existingProject = await Project.findOne({ createdFromHiringAgreement: agreement._id });
  if (existingProject) {
    const workers = await ProjectWorker.find({ projectId: existingProject._id }).populate(
      'workerId',
      'name email phone'
    );
    return { project: existingProject, workers };
  }

  const job = await Job.findById(agreement.jobId);
  if (!job) {
    const error = new Error('Associated job not found');
    error.statusCode = 404;
    throw error;
  }

  const locStr = typeof job.location === 'string'
    ? job.location
    : [job.location?.area, job.location?.city].filter(Boolean).join(', ') || job.city || job.location?.address || '';

  const projectPayload = {
    jobId: agreement.jobId,
    employerId: agreement.employerId,
    hiringAgreementId: agreement._id || agreement.id,
    createdFromHiringAgreement: agreement._id || agreement.id,
    title: overrides.title || overrides.name || job.title || 'Project',
    name: overrides.title || overrides.name || job.title || 'Project',
    description: overrides.description || job.description || '',
    projectType: agreement.durationType,
    location: locStr,
    durationType: agreement.durationType,
    startDate: agreement.startDate,
    expectedEndDate: agreement.estimatedEndDate || agreement.expectedEndDate,
    originalEstimatedEndDate: agreement.estimatedEndDate || agreement.expectedEndDate,
    currentExpectedEndDate: agreement.estimatedEndDate || agreement.expectedEndDate,
    workingHours: agreement.workingHours,
    paymentType: agreement.wageType,
    paymentAmount: agreement.agreedWage || agreement.proposedWage,
    workersRequired: job.workersRequired || 1,
    progressPercentage: 0,
    status: 'confirmed',
  };

  const projectDocs = await Project.create(projectPayload);
  const project = Array.isArray(projectDocs) ? projectDocs[0] : projectDocs;

  const workerPayload = {
    projectId: project._id,
    workerId: agreement.workerId,
    hiringAgreementId: agreement._id,
    agreedWage: agreement.agreedWage || agreement.proposedWage,
    wageType: agreement.wageType,
    startDate: agreement.startDate,
    expectedEndDate: agreement.estimatedEndDate,
    role: 'worker',
    status: 'confirmed',
    workerAccepted: true,
    employerAccepted: true,
  };

  const workerDocs = await ProjectWorker.create(workerPayload);
  const workers = Array.isArray(workerDocs) ? workerDocs : [workerDocs];

  return { project, workers };
};

export const getWorkerProjects = async (workerId) => {
  const projectWorkers = await ProjectWorker.find({ workerId })
    .populate({
      path: 'projectId',
      populate: [
        { path: 'employerId', select: 'name email phone' },
        { path: 'jobId', select: 'title skillRequired' },
      ],
    })
    .sort({ createdAt: -1 });

  return projectWorkers;
};

export const getEmployerProjects = async (employerId) => {
  const projects = await Project.find({ employerId })
    .populate('jobId', 'title skillRequired')
    .sort({ createdAt: -1 })
    .lean();

  const projectIds = projects.map((p) => p._id);
  const workers = await ProjectWorker.find({ projectId: { $in: projectIds } })
    .populate('workerId', 'name email phone preferredLanguage status')
    .lean();

  const workerMap = {};
  workers.forEach((w) => {
    const pId = w.projectId.toString();
    if (!workerMap[pId]) workerMap[pId] = [];
    workerMap[pId].push(w);
  });

  return projects.map((p) => ({
    ...p,
    workers: workerMap[p._id.toString()] || [],
  }));
};

export const getProject = async (userId, userRole, projectId) => {
  const project = await Project.findById(projectId)
    .populate('jobId')
    .populate('employerId', 'name email phone');

  if (!project) {
    const error = new Error('Project not found');
    error.statusCode = 404;
    throw error;
  }

  let userWorkerRecord = null;
  const employerId = (project.employerId?._id || project.employerId?.id || project.employerId)?.toString();
  if (userRole === 'employer') {
    if (employerId !== userId.toString()) {
      const error = new Error('Unauthorized access to project');
      error.statusCode = 403;
      throw error;
    }
  } else {
    userWorkerRecord = await ProjectWorker.findOne({ projectId, workerId: userId });
    if (!userWorkerRecord) {
      const error = new Error('Unauthorized: You are not assigned to this project');
      error.statusCode = 403;
      throw error;
    }
  }

  const workers = await ProjectWorker.find({ projectId }).populate(
    'workerId',
    'name email phone preferredLanguage status'
  );

  return { project, workers, userWorkerRecord };
};

export const startProject = async (userId, userRole, projectId) => {
  const { project } = await getProject(userId, userRole, projectId);

  if (project.status !== 'confirmed') {
    const error = new Error(`Cannot start project from '${project.status}' status. Must be 'confirmed'.`);
    error.statusCode = 400;
    throw error;
  }

  project.status = 'in_progress';
  await project.save();

  await ProjectWorker.updateMany({ projectId }, { status: 'active' });

  return project;
};

export const requestCompletion = async (userId, userRole, projectId) => {
  const { project } = await getProject(userId, userRole, projectId);

  if (project.status !== 'in_progress') {
    const error = new Error(`Cannot request completion for project in '${project.status}' status. Must be 'in_progress'.`);
    error.statusCode = 400;
    throw error;
  }

  project.status = 'completion_requested';
  await project.save();

  return project;
};

export const completeProject = async (userId, userRole, projectId) => {
  const { project } = await getProject(userId, userRole, projectId);

  if (project.status !== 'in_progress' && project.status !== 'completion_requested') {
    const error = new Error(`Cannot mark project completed from '${project.status}' status.`);
    error.statusCode = 400;
    throw error;
  }

  project.status = 'completed';
  project.completedAt = new Date();
  project.progressPercentage = 100;
  await project.save();

  await ProjectWorker.updateMany({ projectId }, { status: 'completed' });

  return project;
};

export const cancelProject = async (userId, userRole, projectId) => {
  const { project } = await getProject(userId, userRole, projectId);

  if (project.status === 'completed' || project.status === 'closed') {
    const error = new Error(`Cannot cancel project in '${project.status}' status.`);
    error.statusCode = 400;
    throw error;
  }

  project.status = 'cancelled';
  await project.save();

  await ProjectWorker.updateMany({ projectId }, { status: 'cancelled' });

  return project;
};
