import { Project, ProjectWorker, ProjectExtension } from '../models/index.js';

export const createRequest = async (user, projectId, inputData) => {
  const project = await Project.findById(projectId);
  if (!project) {
    const error = new Error('Project not found');
    error.statusCode = 404;
    throw error;
  }

  if (['completed', 'closed', 'cancelled'].includes(project.status)) {
    const error = new Error(`Cannot request extension for project with status ${project.status}`);
    error.statusCode = 400;
    throw error;
  }

  const isEmployer = project.employerId.toString() === user.id;
  const projectWorker = await ProjectWorker.findOne({
    projectId,
    workerId: user.id,
    status: { $in: ['confirmed', 'active'] },
  });
  const isWorker = !!projectWorker;

  if (!isEmployer && !isWorker) {
    const error = new Error('Unauthorized to request extension for this project');
    error.statusCode = 403;
    throw error;
  }

  let targetProjectWorkerId = inputData.projectWorkerId || null;
  if (!targetProjectWorkerId && isWorker) {
    targetProjectWorkerId = projectWorker._id;
  }

  let previousWage = null;
  if (targetProjectWorkerId) {
    const pw = await ProjectWorker.findById(targetProjectWorkerId);
    if (pw) previousWage = pw.agreedWage;
  } else {
    previousWage = project.paymentAmount;
  }

  const previousEndDate = project.currentExpectedEndDate || project.originalEstimatedEndDate || project.startDate;
  const requestedEndDate = new Date(inputData.requestedEndDate);

  if (requestedEndDate <= new Date(previousEndDate)) {
    const error = new Error('Requested end date must be after the current expected end date');
    error.statusCode = 400;
    throw error;
  }

  const workerApproval = isWorker ? 'approved' : 'pending';
  const employerApproval = isEmployer ? 'approved' : 'pending';

  const extension = new ProjectExtension({
    projectId,
    projectWorkerId: targetProjectWorkerId,
    requestedBy: user.id,
    requestType: 'duration_extension',
    previousEndDate,
    requestedEndDate,
    previousWage,
    proposedWage: inputData.proposedWage || null,
    reason: inputData.reason,
    workerApproval,
    employerApproval,
    status: 'pending',
    version: 1,
  });

  await extension.save();
  return await extension.populate(['projectId', 'requestedBy', 'projectWorkerId']);
};

export const approveRequest = async (user, extensionId) => {
  const extension = await ProjectExtension.findById(extensionId);
  if (!extension) {
    const error = new Error('Extension request not found');
    error.statusCode = 404;
    throw error;
  }

  if (extension.status !== 'pending') {
    const error = new Error(`Extension request is already ${extension.status}`);
    error.statusCode = 400;
    throw error;
  }

  const project = await Project.findById(extension.projectId);
  if (!project) {
    const error = new Error('Associated project not found');
    error.statusCode = 404;
    throw error;
  }

  const isEmployer = project.employerId.toString() === user.id;
  const projectWorker = await ProjectWorker.findOne({
    projectId: project._id,
    workerId: user.id,
    status: { $in: ['confirmed', 'active'] },
  });
  const isWorker = !!projectWorker;

  if (!isEmployer && !isWorker) {
    const error = new Error('Unauthorized to approve this extension request');
    error.statusCode = 403;
    throw error;
  }

  if (isEmployer) {
    extension.employerApproval = 'approved';
  }
  if (isWorker) {
    extension.workerApproval = 'approved';
  }

  if (extension.workerApproval === 'approved' && extension.employerApproval === 'approved') {
    extension.status = 'approved';
    extension.effectiveAt = new Date();

    const previousApprovedCount = await ProjectExtension.countDocuments({
      projectId: project._id,
      status: 'approved',
    });
    extension.version = previousApprovedCount + 1;

    if (!project.originalEstimatedEndDate) {
      project.originalEstimatedEndDate = project.currentExpectedEndDate || project.startDate;
    }
    project.currentExpectedEndDate = extension.requestedEndDate;
    await project.save();

    if (extension.projectWorkerId) {
      const pw = await ProjectWorker.findById(extension.projectWorkerId);
      if (pw) {
        pw.expectedEndDate = extension.requestedEndDate;
        if (extension.proposedWage && extension.proposedWage > 0) {
          pw.agreedWage = extension.proposedWage;
        }
        await pw.save();
      }
    } else {
      const updateFields = { expectedEndDate: extension.requestedEndDate };
      if (extension.proposedWage && extension.proposedWage > 0) {
        updateFields.agreedWage = extension.proposedWage;
      }
      await ProjectWorker.updateMany({ projectId: project._id }, { $set: updateFields });
    }
  }

  await extension.save();
  return await extension.populate(['projectId', 'requestedBy', 'projectWorkerId']);
};

export const rejectRequest = async (user, extensionId) => {
  const extension = await ProjectExtension.findById(extensionId);
  if (!extension) {
    const error = new Error('Extension request not found');
    error.statusCode = 404;
    throw error;
  }

  if (extension.status !== 'pending') {
    const error = new Error(`Extension request is already ${extension.status}`);
    error.statusCode = 400;
    throw error;
  }

  const project = await Project.findById(extension.projectId);
  if (!project) {
    const error = new Error('Associated project not found');
    error.statusCode = 404;
    throw error;
  }

  const isEmployer = project.employerId.toString() === user.id;
  const isWorker = await ProjectWorker.exists({
    projectId: project._id,
    workerId: user.id,
  });

  if (!isEmployer && !isWorker) {
    const error = new Error('Unauthorized to reject this extension request');
    error.statusCode = 403;
    throw error;
  }

  if (isEmployer) {
    extension.employerApproval = 'rejected';
  }
  if (isWorker) {
    extension.workerApproval = 'rejected';
  }

  extension.status = 'rejected';
  await extension.save();
  return await extension.populate(['projectId', 'requestedBy', 'projectWorkerId']);
};

export const cancelRequest = async (user, extensionId) => {
  const extension = await ProjectExtension.findById(extensionId);
  if (!extension) {
    const error = new Error('Extension request not found');
    error.statusCode = 404;
    throw error;
  }

  if (extension.status !== 'pending') {
    const error = new Error(`Extension request is already ${extension.status}`);
    error.statusCode = 400;
    throw error;
  }

  if (extension.requestedBy.toString() !== user.id) {
    const error = new Error('Only the creator can cancel their pending extension request');
    error.statusCode = 403;
    throw error;
  }

  extension.status = 'cancelled';
  await extension.save();
  return await extension.populate(['projectId', 'requestedBy', 'projectWorkerId']);
};

export const getProjectExtensions = async (user, projectId) => {
  const project = await Project.findById(projectId);
  if (!project) {
    const error = new Error('Project not found');
    error.statusCode = 404;
    throw error;
  }

  const isEmployer = project.employerId.toString() === user.id;
  const isWorker = await ProjectWorker.exists({ projectId, workerId: user.id });

  if (!isEmployer && !isWorker) {
    const error = new Error('Unauthorized to view extensions for this project');
    error.statusCode = 403;
    throw error;
  }

  return await ProjectExtension.find({ projectId })
    .sort({ createdAt: -1 })
    .populate(['requestedBy', 'projectWorkerId']);
};

export const getMyExtensionRequests = async (user) => {
  return await ProjectExtension.find({ requestedBy: user.id })
    .sort({ createdAt: -1 })
    .populate(['projectId', 'projectWorkerId']);
};
